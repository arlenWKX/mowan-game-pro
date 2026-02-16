/**
 * 事件总线 - 游戏事件驱动架构
 * 
 * 设计原则：
 * 1. 所有玩家（包括人机）使用相同的事件接口
 * 2. 部署和行动阶段都是并行的，所有玩家同时决策
 * 3. 人机通过调度器触发，但执行相同的业务逻辑
 */

import { db } from "./db";
import { scheduleAllBotDeploys, scheduleAllBotActions } from "./bot-service";
import type { GameAction } from "@/types";

// ============================================
// Event Types
// ============================================

export enum EventType {
  GAME_STARTED = "GAME_STARTED",
  PLAYER_DEPLOY = "PLAYER_DEPLOY",
  PLAYER_ACTION = "PLAYER_ACTION",
  ROUND_SETTLEMENT = "ROUND_SETTLEMENT",
  BRANCH_COMPLETED = "BRANCH_COMPLETED",
  SPLIT_COMPLETED = "SPLIT_COMPLETED",
}

export interface GameEvent {
  id: string;
  type: EventType;
  roomId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

// ============================================
// Split/Branch Types
// ============================================

export type BranchStatus = "pending" | "completed" | "failed";

export interface Branch {
  branchId: string;
  playerId: string;
  status: BranchStatus;
  result?: unknown;
}

export interface Split {
  splitId: string;
  roomId: string;
  type: "deploy" | "action";
  branches: Map<string, Branch>;
  completedAt?: number;
}

// ============================================
// Event Bus
// ============================================

class EventBus {
  private splits: Map<string, Split> = new Map();
  private roomActiveSplit: Map<string, string> = new Map();

  /**
   * 发出事件
   */
  async emit(event: GameEvent): Promise<void> {
    console.log(`[EventBus] Emit: ${event.type} for room ${event.roomId}`);

    switch (event.type) {
      case EventType.GAME_STARTED:
        await this.handleGameStarted(event);
        break;
      case EventType.PLAYER_DEPLOY:
        await this.handlePlayerDeploy(event);
        break;
      case EventType.PLAYER_ACTION:
        await this.handlePlayerAction(event);
        break;
      case EventType.BRANCH_COMPLETED:
        await this.handleBranchCompleted(event);
        break;
      default:
        console.log(`[EventBus] Unhandled event type: ${event.type}`);
    }
  }

  /**
   * 获取房间当前活跃的 Split
   */
  async getActiveSplit(roomId: string): Promise<Split | null> {
    const splitId = this.roomActiveSplit.get(roomId);
    if (!splitId) return null;
    return this.splits.get(splitId) || null;
  }

  /**
   * 完成分支
   */
  async completeBranch(
    roomId: string,
    splitId: string,
    branchId: string,
    result?: unknown
  ): Promise<void> {
    const split = this.splits.get(splitId);
    if (!split) return;

    const branch = split.branches.get(branchId);
    if (!branch) return;

    branch.status = "completed";
    branch.result = result;

    console.log(`[EventBus] Branch ${branchId} completed in split ${splitId}`);

    // 检查是否所有分支都完成了
    await this.checkSplitCompletion(split);
  }

  // ============================================
  // Event Handlers
  // ============================================

  private async handleGameStarted(event: GameEvent): Promise<void> {
    const { roomId, payload } = event;
    const { turnOrder } = payload as { turnOrder: string[] };

    console.log(`[EventBus] Game started for room ${roomId}`);

    // 注意：waiting 阶段已经完成部署，直接进入行动阶段
    // 所有玩家（包括人机）在 waiting 阶段通过 /ready API 或自动准备完成部署
    await this.startActionPhase(roomId);
  }

  private async handlePlayerDeploy(event: GameEvent): Promise<void> {
    const { payload } = event;
    const { playerId, splitId, branchId } = payload as {
      playerId: string;
      splitId: string;
      branchId: string;
    };

    console.log(`[EventBus] Player ${playerId} deployed in split ${splitId}`);
    await this.completeBranch(event.roomId, splitId, branchId);
  }

  private async handlePlayerAction(event: GameEvent): Promise<void> {
    const { payload } = event;
    const { playerId, action, splitId, branchId } = payload as {
      playerId: string;
      action: GameAction;
      splitId: string;
      branchId: string;
    };

    console.log(`[EventBus] Player ${playerId} acted in split ${splitId}`, action);

    // 执行移动（与玩家API相同的逻辑）
    const room = db.getRoom(event.roomId);
    if (!room) return;

    if (action.type === "move") {
      db.movePiece(event.roomId, playerId, action.from, action.to);
      
      // 记录玩家行动
      db.playerAction(event.roomId, playerId);
    }

    await this.completeBranch(event.roomId, splitId, branchId);
  }

  private async handleBranchCompleted(event: GameEvent): Promise<void> {
    // 分支完成已在 completeBranch 中处理
  }

  // ============================================
  // Split Management
  // ============================================

  private async checkSplitCompletion(split: Split): Promise<void> {
    const allCompleted = Array.from(split.branches.values()).every(
      (b) => b.status === "completed"
    );

    if (!allCompleted) return;

    console.log(`[EventBus] Split ${split.splitId} completed`);
    split.completedAt = Date.now();

    // 根据 split 类型决定下一步
    const room = db.getRoom(split.roomId);
    if (!room) return;

    if (split.type === "deploy") {
      // 部署完成，进入游戏行动阶段
      await this.startActionPhase(split.roomId);
    } else if (split.type === "action") {
      // 行动完成，进入结算
      await this.startSettlement(split.roomId);
    }
  }

  private async startActionPhase(roomId: string): Promise<void> {
    const room = db.getRoom(roomId);
    if (!room) return;

    console.log(`[EventBus] Starting action phase for room ${roomId}`);

    // 更新房间状态
    db.updateRoomGameState(roomId, {
      phase: "action",
      currentRound: 1,
      currentTurn: 0,
      actedPlayers: [],
      needsSettlement: false,
    });

    // 创建行动阶段的分叉（并行行动）
    const splitId = `action_${roomId}_${Date.now()}`;
    const split: Split = {
      splitId,
      roomId,
      type: "action",
      branches: new Map(),
    };

    // 为所有活跃玩家创建分支
    const players = db.getRoomPlayers(roomId).filter((p) => p.isActive);
    for (const player of players) {
      const branchId = `action_${player.userId}`;
      split.branches.set(branchId, {
        branchId,
        playerId: player.userId,
        status: "pending",
      });
    }

    this.splits.set(splitId, split);
    this.roomActiveSplit.set(roomId, splitId);

    console.log(`[EventBus] Created action split ${splitId} with ${players.length} branches`);

    // 调度人机行动（人机将与玩家并行行动）
    scheduleAllBotActions(roomId, splitId);
  }

  private async startSettlement(roomId: string): Promise<void> {
    const room = db.getRoom(roomId);
    if (!room) return;

    console.log(`[EventBus] Starting settlement for room ${roomId}`);

    // 标记需要结算
    db.updateRoomGameState(roomId, {
      phase: "settlement",
      needsSettlement: true,
    });

    // 执行结算
    const result = db.settleRound(roomId);

    console.log(`[EventBus] Settlement result:`, result);

    // 结算后，根据结果决定下一步
    if (result.extraTurnPlayer) {
      // 有玩家获得额外回合
      db.updateRoomGameState(roomId, {
        phase: "extra_turn",
      });
      // 设置当前回合玩家
      const room = db.getRoom(roomId);
      if (room) {
        const idx = room.turnOrder.indexOf(result.extraTurnPlayer);
        if (idx >= 0) {
          room.currentTurn = idx;
        }
      }
    } else {
      // 正常进入下一轮行动
      await this.startActionPhase(roomId);
    }
  }
}

// ============================================
// Singleton
// ============================================

let eventBusInstance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

export function initializeEventBus(): EventBus {
  return getEventBus();
}

// 兼容旧代码的导出
export const eventBus = {
  getActiveSplit: async (roomId: string) => {
    return getEventBus().getActiveSplit(roomId);
  },
  completeBranch: async (
    roomId: string,
    splitId: string,
    branchId: string,
    result?: unknown
  ) => {
    return getEventBus().completeBranch(roomId, splitId, branchId, result);
  },
};
