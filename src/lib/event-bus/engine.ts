/**
 * 事件总线 - 核心引擎
 * 
 * 特性：
 * 1. 事件发布/订阅
 * 2. 自动流转（根据Transition定义）
 * 3. 并行分叉（ParallelSplit）
 * 4. 并行汇合（ParallelJoin）
 * 5. 条件守卫（Guard）
 * 6. 支持循环（通过Transition实现）
 */

import { generateId } from '@/lib/utils';
import {
  BaseEvent,
  EventType,
  EventHandler,
  EventTransition,
  FlowContext,
  ActiveSplit,
  BranchStatus,
  JoinCondition,
  ParallelSplitEvent,
  ParallelJoinEvent,
  EventBusConfig,
  GameFlowState,
} from './types';

export class EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  private transitions: EventTransition[] = [];
  private config: EventBusConfig;
  private timeoutTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: EventBusConfig) {
    this.config = config;
  }

  /**
   * 注册事件处理器
   */
  on<T extends BaseEvent>(type: EventType, handler: EventHandler<T>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler as EventHandler);
  }

  /**
   * 注册多个处理器
   */
  onMany(handlers: Partial<Record<EventType, EventHandler[]>>): void {
    for (const [type, handlersList] of Object.entries(handlers)) {
      for (const handler of handlersList || []) {
        this.on(type as EventType, handler);
      }
    }
  }

  /**
   * 注册事件流转规则
   */
  registerTransition(transition: EventTransition): void {
    this.transitions.push(transition);
  }

  /**
   * 注册多个流转规则
   */
  registerTransitions(transitions: EventTransition[]): void {
    this.transitions.push(...transitions);
  }

  /**
   * 发布事件 - 核心方法
   */
  async emit<T extends BaseEvent>(event: T): Promise<void> {
    // 1. 确保事件有ID和时间戳
    if (!event.id) {
      event.id = generateId();
    }
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }

    // 2. 记录日志
    if (this.config.enableLogging) {
      console.log(`[EventBus] ${event.type} @ ${event.roomId}`, event.payload);
    }

    // 3. 持久化事件
    await this.config.store.append(event);

    // 4. 执行事件处理器
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler error for ${event.type}:`, error);
        // 发出错误事件
        await this.emit({
          id: generateId(),
          type: EventType.ERROR,
          roomId: event.roomId,
          timestamp: Date.now(),
          payload: { originalEvent: event, error },
          parentId: event.id,
        } as BaseEvent);
      }
    }

    // 5. 自动流转（特殊事件类型不自动流转）
    if (!this.isTerminalEvent(event.type)) {
      await this.autoTransition(event);
    }
  }

  /**
   * 创建并行分叉
   */
  async createParallelSplit(
    roomId: string,
    branches: { branchId: string; playerId?: string; type: 'deploy' | 'action' }[],
    joinCondition: JoinCondition,
    nextEvent: EventType,
    timeout?: number,
    phase?: 'deploy' | 'action'
  ): Promise<string> {
    // 使用带前缀的 splitId 以便区分阶段
    const prefix = phase || 'split';
    const splitId = `${prefix}_${generateId()}`;
    const eventId = generateId();

    // 创建分支状态映射
    const branchMap = new Map<string, BranchStatus>();
    for (const branch of branches) {
      branchMap.set(branch.branchId, {
        branchId: branch.branchId,
        playerId: branch.playerId,
        status: 'pending',
      });
    }

    // 创建活跃分叉记录
    const activeSplit: ActiveSplit = {
      splitId,
      eventId,
      branches: branchMap,
      joinCondition,
      timeoutAt: timeout ? Date.now() + timeout : undefined,
      nextEvent,
    };

    await this.config.store.saveActiveSplit(roomId, activeSplit);

    // 发出分叉事件
    await this.emit({
      id: eventId,
      type: EventType.PARALLEL_SPLIT,
      roomId,
      timestamp: Date.now(),
      payload: {
        splitId,
        branches: branches.map(b => ({
          branchId: b.branchId,
          playerId: b.playerId,
          type: b.type,
        })),
        joinCondition,
        timeout,
        nextEvent,
      },
    } as ParallelSplitEvent);

    // 设置超时定时器
    if (timeout) {
      const timer = setTimeout(() => {
        this.handleTimeout(roomId, splitId);
      }, timeout);
      this.timeoutTimers.set(splitId, timer);
    }

    return splitId;
  }

  /**
   * 完成分支
   */
  async completeBranch(
    roomId: string,
    splitId: string,
    branchId: string,
    result?: unknown
  ): Promise<boolean> {
    const activeSplit = await this.config.store.getActiveSplit(roomId);
    if (!activeSplit || activeSplit.splitId !== splitId) {
      console.warn(`[EventBus] No active split found for ${splitId}`);
      return false;
    }

    // 更新分支状态
    const branch = activeSplit.branches.get(branchId);
    if (!branch) {
      console.warn(`[EventBus] Branch ${branchId} not found in split ${splitId}`);
      return false;
    }

    if (branch.status === 'completed') {
      return false; // 已经处理过了
    }

    branch.status = 'completed';
    branch.completedAt = Date.now();
    branch.result = result;

    // 检查是否满足汇合条件
    const shouldJoin = this.checkJoinCondition(activeSplit);

    if (shouldJoin) {
      // 清理定时器
      const timer = this.timeoutTimers.get(splitId);
      if (timer) {
        clearTimeout(timer);
        this.timeoutTimers.delete(splitId);
      }

      // 清除活跃分叉
      await this.config.store.saveActiveSplit(roomId, null);

      // 发出汇合事件
      const completedBranches = Array.from(activeSplit.branches.values())
        .filter(b => b.status === 'completed')
        .map(b => b.branchId);

      await this.emit({
        id: generateId(),
        type: EventType.PARALLEL_JOIN,
        roomId,
        timestamp: Date.now(),
        payload: {
          splitId,
          completedBranches,
          timedOut: false,
        },
      } as ParallelJoinEvent);

      return true;
    }

    // 保存更新后的状态
    await this.config.store.saveActiveSplit(roomId, activeSplit);
    return false;
  }

  /**
   * 获取活跃分叉
   */
  async getActiveSplit(roomId: string): Promise<ActiveSplit | null> {
    return this.config.store.getActiveSplit(roomId);
  }

  /**
   * 获取流程上下文
   */
  async getFlowContext(roomId: string): Promise<FlowContext> {
    const history = await this.config.store.getHistory(roomId);
    const activeSplit = await this.config.store.getActiveSplit(roomId);
    const gameState = this.buildGameState(history);

    return {
      roomId,
      eventHistory: history,
      activeSplit: activeSplit || undefined,
      gameState,
    };
  }

  /**
   * 检查是否为终端事件（不自动流转）
   */
  private isTerminalEvent(type: EventType): boolean {
    return [
      EventType.ERROR,
      EventType.GAME_ENDED,
      EventType.PARALLEL_SPLIT, // 分叉事件由分支完成触发流转
    ].includes(type);
  }

  /**
   * 自动流转到下一个事件
   */
  private async autoTransition(event: BaseEvent): Promise<void> {
    // 找到匹配的流转规则
    const matchingTransitions = this.transitions.filter(t => t.from === event.type);

    for (const transition of matchingTransitions) {
      try {
        // 获取流程上下文
        const context = await this.getFlowContext(event.roomId);

        // 检查守卫条件
        if (transition.guard) {
          const guardResult = await transition.guard(context);
          if (!guardResult) {
            continue; // 守卫条件不满足，尝试下一个流转
          }
        }

        // 确定目标事件类型
        const targetTypes = Array.isArray(transition.to) ? transition.to : [transition.to];

        for (const targetType of targetTypes) {
          // 创建新事件
          let newEvent: BaseEvent = {
            id: generateId(),
            type: targetType,
            roomId: event.roomId,
            timestamp: Date.now(),
            parentId: event.id,
            payload: {},
          };

          // 应用转换函数
          if (transition.transform) {
            newEvent = await transition.transform(event, context);
          }

          // 发出新事件
          await this.emit(newEvent);
        }

        // 找到匹配的流转后停止（避免多个流转同时触发）
        break;
      } catch (error) {
        console.error(`[EventBus] Transition error:`, error);
      }
    }
  }

  /**
   * 检查汇合条件
   */
  private checkJoinCondition(activeSplit: ActiveSplit): boolean {
    const branches = Array.from(activeSplit.branches.values());
    const completedCount = branches.filter(b => b.status === 'completed').length;

    switch (activeSplit.joinCondition.type) {
      case 'all':
        return completedCount === branches.length;
      case 'any':
        return completedCount >= 1;
      case 'count':
        return completedCount >= activeSplit.joinCondition.count;
      default:
        return false;
    }
  }

  /**
   * 处理超时
   */
  private async handleTimeout(roomId: string, splitId: string): Promise<void> {
    const activeSplit = await this.config.store.getActiveSplit(roomId);
    if (!activeSplit || activeSplit.splitId !== splitId) {
      return;
    }

    // 标记未完成的分支为超时
    for (const branch of Array.from(activeSplit.branches.values())) {
      if (branch.status === 'pending') {
        branch.status = 'timeout';
      }
    }

    // 清除活跃分叉
    await this.config.store.saveActiveSplit(roomId, null);
    this.timeoutTimers.delete(splitId);

    // 发出超时事件
    await this.emit({
      id: generateId(),
      type: EventType.TIMEOUT,
      roomId,
      timestamp: Date.now(),
      payload: { splitId, activeSplit },
    });

    // 发出汇合事件（带超时标记）
    const completedBranches = Array.from(activeSplit.branches.values())
      .filter(b => b.status === 'completed')
      .map(b => b.branchId);

    await this.emit({
      id: generateId(),
      type: EventType.PARALLEL_JOIN,
      roomId,
      timestamp: Date.now(),
      payload: {
        splitId,
        completedBranches,
        timedOut: true,
      },
    } as ParallelJoinEvent);
  }

  /**
   * 从事件历史构建游戏状态
   */
  private buildGameState(history: BaseEvent[]): GameFlowState {
    const state: GameFlowState = {
      phase: 'deploy',
      round: 0,
      turnOrder: [],
      activePlayers: [],
      pendingActions: [],
      publicArea: [],
    };

    for (const event of history) {
      switch (event.type) {
        case EventType.GAME_STARTED:
          state.phase = 'deploy';
          break;
        case EventType.DEPLOY_PHASE_ENDED:
          state.phase = 'action';
          state.round = 1;
          break;
        case EventType.ROUND_STARTED:
          state.round = (event.payload as { round: number }).round;
          state.phase = 'action';
          break;
        case EventType.SETTLEMENT_STARTED:
          state.phase = 'settlement';
          break;
        case EventType.EXTRA_TURN_STARTED:
          state.phase = 'extra_turn';
          break;
        case EventType.GAME_ENDED:
          state.phase = 'ended';
          break;
      }
    }

    return state;
  }
}

// 单例导出
let globalEventBus: EventBus | null = null;

export function createEventBus(config: EventBusConfig): EventBus {
  globalEventBus = new EventBus(config);
  return globalEventBus;
}

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    throw new Error('EventBus not initialized. Call createEventBus first.');
  }
  return globalEventBus;
}
