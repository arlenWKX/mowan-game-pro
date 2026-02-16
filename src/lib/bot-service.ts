/**
 * 人机服务 - 统一的人机行动接口
 * 
 * 设计原则：
 * 1. 人机使用与玩家类似的"内部 API"接口
 * 2. 部署和行动逻辑与玩家 API 共享相同的业务逻辑
 * 3. 通过事件总线触发，但执行的是标准化的服务函数
 */

import { db } from "@/lib/db";
import { generateId, createRandomBoard, canMoveForward } from "@/lib/utils";
import { getEventBus, EventType } from "@/lib/event-bus";
import type { Board, CellId, Player, Room, GameAction } from "@/types";

// ============================================
// Bot AI 决策逻辑
// ============================================

class BotAI {
  /**
   * 生成部署棋盘 - 随机策略
   */
  static generateBoard(): Board {
    return createRandomBoard();
  }

  /**
   * 决策下一步行动
   * 返回 null 表示没有可行动的棋子
   */
  static decideAction(player: Player, room: Room): GameAction | null {
    if (!player.isActive) return null;

    // 找到所有可以移动的棋子
    const movablePieces: { from: string; to: string | "public" }[] = [];

    for (const [cellId, num] of Object.entries(player.board)) {
      if (num !== null) {
        const result = canMoveForward(player.board, cellId as CellId);
        if (result.can && result.result) {
          movablePieces.push({
            from: cellId,
            to: result.result === "public" ? "public" : result.result,
          });
        }
      }
    }

    if (movablePieces.length === 0) return null;

    // 随机选择一个移动
    const move = movablePieces[Math.floor(Math.random() * movablePieces.length)];
    return { type: "move", ...move };
  }
}

// ============================================
// 内部服务函数 - 与 API 路由共享的业务逻辑
// ============================================

/**
 * 执行部署 - 对应 POST /api/rooms/[id]/ready
 * 
 * @param roomId 房间ID
 * @param playerId 玩家ID（人机ID）
 * @param board 部署的棋盘
 * @param splitId 当前分叉ID（游戏进行中时需要）
 * @param branchId 当前分支ID（游戏进行中时需要）
 * @returns 部署结果
 */
export async function executeDeploy(
  roomId: string,
  playerId: string,
  board: Board,
  splitId?: string,
  branchId?: string
): Promise<{ success: boolean; error?: string }> {
  const room = db.getRoom(roomId);
  if (!room) {
    return { success: false, error: "房间不存在" };
  }

  const players = db.getRoomPlayers(roomId);
  const player = players.find((p) => p.userId === playerId);
  if (!player) {
    return { success: false, error: "玩家不在该房间中" };
  }

  const eventBus = getEventBus();

  // 游戏未开始时，直接更新玩家棋盘
  if (room.status === "waiting") {
    const success = db.updatePlayerBoard(roomId, playerId, board, []);
    if (!success) {
      return { success: false, error: "部署失败，请重试" };
    }
    return { success: true };
  }

  // 游戏进行中，使用事件总线
  if (room.status === "playing") {
    if (!splitId || !branchId) {
      // 如果没有提供 splitId/branchId，尝试从事件总线获取
      const activeSplit = await eventBus.getActiveSplit(roomId);
      if (!activeSplit) {
        return { success: false, error: "当前不在部署阶段" };
      }
      splitId = activeSplit.splitId;
      branchId = `deploy_${playerId}`;
    }

    // 发出部署事件（与玩家 API 调用相同的逻辑）
    await eventBus.emit({
      id: generateId(),
      type: EventType.PLAYER_DEPLOY,
      roomId,
      timestamp: Date.now(),
      payload: {
        playerId,
        board,
        splitId,
        branchId,
      },
    });

    return { success: true };
  }

  return { success: false, error: "游戏已结束" };
}

/**
 * 执行行动 - 对应 POST /api/rooms/[id]/action
 * 
 * @param roomId 房间ID
 * @param playerId 玩家ID（人机ID）
 * @param action 行动数据
 * @param splitId 当前分叉ID（可选，自动获取）
 * @param branchId 当前分支ID（可选，自动计算）
 * @returns 行动结果
 */
export async function executeAction(
  roomId: string,
  playerId: string,
  action: GameAction,
  splitId?: string,
  branchId?: string
): Promise<{ success: boolean; error?: string }> {
  const room = db.getRoom(roomId);
  if (!room) {
    return { success: false, error: "房间不存在" };
  }

  if (room.status !== "playing") {
    return { success: false, error: "游戏未开始或已结束" };
  }

  const players = db.getRoomPlayers(roomId);
  const player = players.find((p) => p.userId === playerId);
  if (!player) {
    return { success: false, error: "玩家不在该房间中" };
  }
  if (!player.isActive) {
    return { success: false, error: "玩家已被淘汰" };
  }

  const eventBus = getEventBus();

  // 如果没有提供 splitId/branchId，尝试从事件总线获取
  if (!splitId || !branchId) {
    const activeSplit = await eventBus.getActiveSplit(roomId);
    if (!activeSplit) {
      return { success: false, error: "当前不在行动阶段" };
    }
    splitId = activeSplit.splitId;
    branchId = `action_${playerId}`;
  }

  // 发出行动事件（与玩家 API 调用相同的逻辑）
  await eventBus.emit({
    id: generateId(),
    type: EventType.PLAYER_ACTION,
    roomId,
    timestamp: Date.now(),
    payload: {
      playerId,
      action,
      splitId,
      branchId,
    },
  });

  return { success: true };
}

// ============================================
// 人机行动调度器
// ============================================

/**
 * 触发人机部署
 * 
 * @param roomId 房间ID
 * @param botId 人机ID
 * @param splitId 分叉ID
 * @param delay 延迟时间（毫秒）
 */
export function scheduleBotDeploy(
  roomId: string,
  botId: string,
  splitId: string,
  delay: number = 1000 + Math.random() * 2000
): void {
  console.log(`[BotService] Scheduling bot deploy for ${botId} in ${delay}ms`);

  setTimeout(async () => {
    try {
      // 1. AI 生成棋盘
      const board = BotAI.generateBoard();

      // 2. 使用与玩家相同的接口执行部署
      const branchId = `deploy_${botId}`;
      const result = await executeDeploy(roomId, botId, board, splitId, branchId);

      if (result.success) {
        console.log(`[BotService] Bot ${botId} deployed successfully`);
      } else {
        console.error(`[BotService] Bot ${botId} deploy failed:`, result.error);
      }
    } catch (error) {
      console.error(`[BotService] Bot ${botId} deploy error:`, error);
    }
  }, delay);
}

/**
 * 触发人机行动
 * 
 * @param roomId 房间ID
 * @param botId 人机ID
 * @param splitId 分叉ID
 * @param delay 延迟时间（毫秒）
 */
export function scheduleBotAction(
  roomId: string,
  botId: string,
  splitId: string,
  delay: number = 2000 + Math.random() * 3000
): void {
  console.log(`[BotService] Scheduling bot action for ${botId} in ${delay}ms`);

  setTimeout(async () => {
    try {
      const room = db.getRoom(roomId);
      const players = db.getRoomPlayers(roomId);
      const player = players.find((p) => p.userId === botId);

      if (!room || !player || !player.isActive) {
        console.log(`[BotService] Bot ${botId} is no longer active`);
        return;
      }

      // 1. AI 决策行动
      const action = BotAI.decideAction(player, room);

      if (!action) {
        console.log(`[BotService] Bot ${botId} has no valid action`);
        // 即使没有有效行动，也应该标记为已完成分支
        // 这里需要通过一个特殊事件来通知完成
        const eventBus = getEventBus();
        await eventBus.completeBranch(roomId, splitId, `action_${botId}`, {
          skipped: true,
        });
        return;
      }

      // 2. 使用与玩家相同的接口执行行动
      const branchId = `action_${botId}`;
      const result = await executeAction(roomId, botId, action, splitId, branchId);

      if (result.success) {
        console.log(`[BotService] Bot ${botId} acted successfully:`, action);
      } else {
        console.error(`[BotService] Bot ${botId} action failed:`, result.error);
      }
    } catch (error) {
      console.error(`[BotService] Bot ${botId} action error:`, error);
    }
  }, delay);
}

// ============================================
// 批量操作
// ============================================

/**
 * 为房间中所有未部署的人机调度部署
 * 
 * 注意：在 waiting 阶段，直接部署；在 playing 阶段，使用事件总线
 */
export function scheduleAllBotDeploys(roomId: string, splitId?: string): void {
  const room = db.getRoom(roomId);
  if (!room) return;

  const players = db.getRoomPlayers(roomId);

  for (const player of players) {
    if (player.isBot && !player.isReady) {
      // 错开每个机器人的部署时间，避免同时执行
      const delay = 1000 + Math.random() * 2000;
      
      if (room.status === 'waiting') {
        // waiting 阶段：直接部署，不走事件总线
        setTimeout(() => {
          const board = BotAI.generateBoard();
          db.updatePlayerBoard(roomId, player.userId, board, []);
          console.log(`[BotService] Bot ${player.userId} ready in waiting phase`);
        }, delay);
      } else if (room.status === 'playing' && splitId) {
        // playing 阶段：通过事件总线部署
        scheduleBotDeploy(roomId, player.userId, splitId, delay);
      }
    }
  }
}

/**
 * 为房间中所有活跃的人机调度行动
 */
export function scheduleAllBotActions(roomId: string, splitId: string): void {
  const players = db.getRoomPlayers(roomId);

  for (const player of players) {
    if (player.isBot && player.isActive) {
      // 错开每个机器人的行动时间
      const delay = 2000 + Math.random() * 3000;
      scheduleBotAction(roomId, player.userId, splitId, delay);
    }
  }
}
