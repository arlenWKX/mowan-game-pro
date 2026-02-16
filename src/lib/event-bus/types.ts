/**
 * 事件总线 - 类型定义
 * 
 * 核心概念：
 * - Event: 游戏状态的原子变更（节点）
 * - Transition: 事件间的流转关系（边）
 * - Flow: 事件构成的有向图，支持循环
 * - ParallelSplit: 分叉为多个并行分支
 * - ParallelJoin: 汇合多个并行分支
 */

// 事件类型
export enum EventType {
  // 房间生命周期
  ROOM_CREATED = 'ROOM_CREATED',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  GAME_STARTED = 'GAME_STARTED',
  GAME_ENDED = 'GAME_ENDED',

  // 部署阶段（并行）
  DEPLOY_PHASE_STARTED = 'DEPLOY_PHASE_STARTED',
  PARALLEL_SPLIT = 'PARALLEL_SPLIT',
  PLAYER_DEPLOY = 'PLAYER_DEPLOY',
  PARALLEL_JOIN = 'PARALLEL_JOIN',
  DEPLOY_PHASE_ENDED = 'DEPLOY_PHASE_ENDED',

  // 行动阶段（循环）
  ROUND_STARTED = 'ROUND_STARTED',
  ACTION_PHASE_STARTED = 'ACTION_PHASE_STARTED',
  PLAYER_ACTION = 'PLAYER_ACTION',
  ACTION_PHASE_ENDED = 'ACTION_PHASE_ENDED',
  SETTLEMENT_STARTED = 'SETTLEMENT_STARTED',
  DUEL_RESOLVED = 'DUEL_RESOLVED',
  SETTLEMENT_ENDED = 'SETTLEMENT_ENDED',

  // 额外回合（条件循环）
  CHECK_EXTRA_TURN = 'CHECK_EXTRA_TURN',
  EXTRA_TURN_STARTED = 'EXTRA_TURN_STARTED',
  RECYCLE_STARTED = 'RECYCLE_STARTED',
  RECYCLE_COMPLETED = 'RECYCLE_COMPLETED',
  EXTRA_TURN_ENDED = 'EXTRA_TURN_ENDED',
  ROUND_ENDED = 'ROUND_ENDED',

  // 系统事件
  TIMEOUT = 'TIMEOUT',
  ERROR = 'ERROR',
  BOT_ACTION = 'BOT_ACTION',
}

// 事件基类
export interface BaseEvent {
  id: string;
  type: EventType;
  roomId: string;
  timestamp: number;
  payload?: unknown;
  parentId?: string; // 父事件ID，用于构建事件链
}

// 并行分叉事件 - 将一个事件分成多个并行分支
export interface ParallelSplitEvent extends BaseEvent {
  type: EventType.PARALLEL_SPLIT;
  payload: {
    splitId: string; // 分叉唯一标识
    branches: BranchDef[]; // 分支定义
    joinCondition: JoinCondition; // 汇合条件
    timeout?: number; // 超时时间（毫秒）
    nextEvent: EventType; // 汇合后触发的事件类型
  };
}

// 分支定义
export interface BranchDef {
  branchId: string; // 分支ID，如 "deploy_player123"
  playerId?: string; // 关联的玩家ID
  type: 'deploy' | 'action'; // 分支类型
}

// 汇合条件
export type JoinCondition =
  | { type: 'all' } // 所有分支都完成
  | { type: 'any' } // 任意分支完成
  | { type: 'count'; count: number }; // 指定数量完成

// 并行汇合事件
export interface ParallelJoinEvent extends BaseEvent {
  type: EventType.PARALLEL_JOIN;
  payload: {
    splitId: string; // 对应的分叉ID
    completedBranches: string[]; // 已完成的分支ID列表
    timedOut: boolean; // 是否因超时而触发
  };
}

// 玩家部署事件
export interface PlayerDeployEvent extends BaseEvent {
  type: EventType.PLAYER_DEPLOY;
  payload: {
    playerId: string;
    board: Record<string, number | null>;
    splitId: string; // 所属分叉ID
    branchId: string; // 所属分支ID
  };
}

// 玩家行动事件
export interface PlayerActionEvent extends BaseEvent {
  type: EventType.PLAYER_ACTION;
  payload: {
    playerId: string;
    action: GameAction;
    splitId: string;
    branchId: string;
  };
}

// 游戏行动类型
export type GameAction =
  | { type: 'move'; from: string; to: string | 'public' }
  | { type: 'recycle'; pieceIndex: number }
  | { type: 'duel'; targetPlayerId: string };

// 结算事件
export interface SettlementEvent extends BaseEvent {
  type: EventType.SETTLEMENT_STARTED;
  payload: {
    round: number;
    pendingActions: PendingAction[];
  };
}

// 待执行行动
export interface PendingAction {
  playerId: string;
  action: GameAction;
  order: number; // 行动顺序
}

// 检查额外回合事件
export interface CheckExtraTurnEvent extends BaseEvent {
  type: EventType.CHECK_EXTRA_TURN;
  payload: {
    round: number;
    publicArea: PublicAreaPiece[];
    players: PlayerState[];
  };
}

// 公共区域棋子
export interface PublicAreaPiece {
  number: number;
  playerId: string;
  cellId?: string;
}

// 玩家状态
export interface PlayerState {
  playerId: string;
  isActive: boolean;
  eliminatedPieces: number[];
}

// 回合开始事件
export interface RoundStartedEvent extends BaseEvent {
  type: EventType.ROUND_STARTED;
  payload: {
    round: number;
    turnOrder: string[];
    activePlayers: string[];
  };
}

// 游戏结束事件
export interface GameEndedEvent extends BaseEvent {
  type: EventType.GAME_ENDED;
  payload: {
    winnerId?: string;
    rankings: { playerId: string; score: number }[];
    reason: 'normal' | 'timeout' | 'surrender';
  };
}

// 机器人行动事件
export interface BotActionEvent extends BaseEvent {
  type: EventType.BOT_ACTION;
  payload: {
    botId: string;
    splitId: string;
    branchId: string;
    actionType: 'deploy' | 'action';
  };
}

// 游戏开始事件
export interface GameStartedEvent extends BaseEvent {
  type: EventType.GAME_STARTED;
  payload: {
    turnOrder: string[];
  };
}

// 部署阶段开始事件
export interface DeployPhaseStartedEvent extends BaseEvent {
  type: EventType.DEPLOY_PHASE_STARTED;
  payload?: {};
}

// 部署阶段结束事件
export interface DeployPhaseEndedEvent extends BaseEvent {
  type: EventType.DEPLOY_PHASE_ENDED;
  payload?: {};
}

// 行动阶段开始事件
export interface ActionPhaseStartedEvent extends BaseEvent {
  type: EventType.ACTION_PHASE_STARTED;
  payload?: {};
}

// 行动阶段结束事件
export interface ActionPhaseEndedEvent extends BaseEvent {
  type: EventType.ACTION_PHASE_ENDED;
  payload?: {};
}

// 结算开始事件
export interface SettlementStartedEvent extends BaseEvent {
  type: EventType.SETTLEMENT_STARTED;
  payload: {
    round: number;
    pendingActions: PendingAction[];
  };
}

// 结算结束事件
export interface SettlementEndedEvent extends BaseEvent {
  type: EventType.SETTLEMENT_ENDED;
  payload?: {};
}

// 额外回合开始事件
export interface ExtraTurnStartedEvent extends BaseEvent {
  type: EventType.EXTRA_TURN_STARTED;
  payload: {
    type: 'recycle' | 'duel';
    playerId: string;
    piece?: PublicAreaPiece;
  };
}

// 额外回合结束事件
export interface ExtraTurnEndedEvent extends BaseEvent {
  type: EventType.EXTRA_TURN_ENDED;
  payload?: {};
}

// 回合结束事件
export interface RoundEndedEvent extends BaseEvent {
  type: EventType.ROUND_ENDED;
  payload?: {};
}

// 玩家加入事件
export interface PlayerJoinedEvent extends BaseEvent {
  type: EventType.PLAYER_JOINED;
  payload: {
    playerId: string;
    username: string;
    nickname: string;
  };
}

// 玩家离开事件
export interface PlayerLeftEvent extends BaseEvent {
  type: EventType.PLAYER_LEFT;
  payload: {
    playerId: string;
  };
}

// 超时事件
export interface TimeoutEvent extends BaseEvent {
  type: EventType.TIMEOUT;
  payload: {
    splitId: string;
    activeSplit: ActiveSplit;
  };
}

// 错误事件
export interface ErrorEvent extends BaseEvent {
  type: EventType.ERROR;
  payload: {
    originalEvent: BaseEvent;
    error: unknown;
  };
}

// 事件处理器类型
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;

// 事件流转定义
export interface EventTransition {
  from: EventType;
  to: EventType | EventType[];
  guard?: (context: FlowContext) => boolean | Promise<boolean>;
  transform?: (event: BaseEvent, context: FlowContext) => BaseEvent | Promise<BaseEvent>;
}

// 流程上下文
export interface FlowContext {
  roomId: string;
  eventHistory: BaseEvent[];
  activeSplit?: ActiveSplit;
  gameState: GameFlowState;
}

// 活跃分叉
export interface ActiveSplit {
  splitId: string;
  eventId: string;
  branches: Map<string, BranchStatus>;
  joinCondition: JoinCondition;
  timeoutAt?: number;
  nextEvent: EventType;
}

// 分支状态
export interface BranchStatus {
  branchId: string;
  playerId?: string;
  status: 'pending' | 'completed' | 'timeout';
  completedAt?: number;
  result?: unknown;
}

// 游戏流程状态
export interface GameFlowState {
  phase: 'deploy' | 'action' | 'settlement' | 'extra_turn' | 'ended';
  round: number;
  turnOrder: string[];
  activePlayers: string[];
  pendingActions: PendingAction[];
  publicArea: PublicAreaPiece[];
  extraTurnType?: 'recycle' | 'duel';
  extraTurnPlayerId?: string;
}

// 事件存储接口
export interface EventStore {
  append(event: BaseEvent): Promise<void>;
  getHistory(roomId: string, since?: number): Promise<BaseEvent[]>;
  getLastEvent(roomId: string): Promise<BaseEvent | null>;
  getActiveSplit(roomId: string): Promise<ActiveSplit | null>;
  saveActiveSplit(roomId: string, split: ActiveSplit | null): Promise<void>;
}

// 事件总线配置
export interface EventBusConfig {
  store: EventStore;
  enableLogging?: boolean;
  maxHistorySize?: number;
  defaultTimeout?: number;
}
