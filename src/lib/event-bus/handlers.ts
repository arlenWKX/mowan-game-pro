/**
 * 魔丸游戏 - 事件处理器
 * 
 * 处理各个事件类型，实现游戏逻辑
 */

import {
  BaseEvent,
  EventType,
  GameStartedEvent,
  DeployPhaseStartedEvent,
  PlayerDeployEvent,
  ParallelJoinEvent,
  DeployPhaseEndedEvent,
  RoundStartedEvent,
  ActionPhaseStartedEvent,
  PlayerActionEvent,
  SettlementStartedEvent,
  SettlementEndedEvent,
  CheckExtraTurnEvent,
  ExtraTurnStartedEvent,
  ExtraTurnEndedEvent,
  RoundEndedEvent,
  GameEndedEvent,
  BotActionEvent,
  GameAction,
  PlayerState,
} from './types';
import { EventBus, getEventBus } from './engine';
import { memoryEventStore } from './store';
import { deployJoinCondition, actionJoinCondition, DEPLOY_TIMEOUT, ACTION_TIMEOUT } from './flow';
import { db } from '@/lib/db';
import { generateId, createRandomBoard, resolvePublicArea, canMoveForward } from '@/lib/utils';
import { Room, Player, CellId } from '@/types';
import { scheduleBotDeploy, scheduleBotAction, scheduleAllBotDeploys, scheduleAllBotActions } from '@/lib/bot-service';

/**
 * 为超时的玩家生成自动行动
 */
function generateAutoAction(player: Player, room: Room): GameAction | null {
  if (!player.isActive) return null;

  // 找到所有可以移动的棋子
  const movablePieces: { from: string; to: string | 'public' }[] = [];
  
  for (const [cellId, num] of Object.entries(player.board)) {
    if (num !== null) {
      const result = canMoveForward(player.board, cellId as CellId);
      if (result.can && result.result) {
        movablePieces.push({
          from: cellId,
          to: result.result === 'public' ? 'public' : result.result,
        });
      }
    }
  }

  if (movablePieces.length === 0) return null;

  // 随机选择一个移动
  const move = movablePieces[Math.floor(Math.random() * movablePieces.length)];
  return { type: 'move', ...move };
}

/**
 * 游戏开始处理器
 */
export async function handleGameStarted(event: GameStartedEvent): Promise<void> {
  const { roomId, payload } = event;
  const room = db.getRoom(roomId);
  if (!room) return;

  // 初始化房间状态
  room.status = 'playing';
  room.currentRound = 1;
  
  // 使用事件 payload 中的 turnOrder 或生成新的
  if (payload.turnOrder && payload.turnOrder.length > 0) {
    room.turnOrder = payload.turnOrder;
  } else {
    // 获取玩家列表并生成行动顺序
    const players = db.getRoomPlayers(roomId);
    const playerIds = players.map(p => p.userId);
    room.turnOrder = playerIds.sort(() => Math.random() - 0.5);
  }
  
  // 获取玩家列表并初始化 acted 状态
  const players = db.getRoomPlayers(roomId);
  for (const player of players) {
    player.hasActed = false;
  }

  console.log(`[EventBus] Game started in room ${roomId}, turnOrder: ${room.turnOrder.join(', ')}`);
}

/**
 * 部署阶段开始处理器
 */
export async function handleDeployPhaseStarted(event: DeployPhaseStartedEvent): Promise<void> {
  const { roomId } = event;
  const room = db.getRoom(roomId);
  if (!room) return;

  // 获取最新的玩家列表（包括人机）
  const players = db.getRoomPlayers(roomId);
  const eventBus = getEventBus();

  // 创建部署分叉 - 每个玩家一个分支
  const branches = players.map(player => ({
    branchId: `deploy_${player.userId}`,
    playerId: player.userId,
    type: 'deploy' as const,
  }));

  const splitId = await eventBus.createParallelSplit(
    roomId,
    branches,
    deployJoinCondition,
    EventType.DEPLOY_PHASE_ENDED,
    DEPLOY_TIMEOUT,
    'deploy'
  );

  console.log(`[EventBus] Deploy phase started with split ${splitId}, players: ${players.length}`);

  // 自动触发机器人部署（使用统一的 bot-service）
  scheduleAllBotDeploys(roomId, splitId);
}

/**
 * 玩家部署处理器
 */
export async function handlePlayerDeploy(event: PlayerDeployEvent): Promise<void> {
  const { roomId, payload } = event;
  const { playerId, board, splitId, branchId } = payload;

  const room = db.getRoom(roomId);
  if (!room) return;

  const player = room.players.find(p => p.userId === playerId);
  if (!player) return;

  // 保存部署
  player.board = board;
  player.isReady = true;
  player.hasActed = true;

  console.log(`[EventBus] Player ${playerId} deployed in room ${roomId}`);

  // 完成分支
  const eventBus = getEventBus();
  await eventBus.completeBranch(roomId, splitId, branchId, { board });
}

/**
 * 部署阶段结束处理器
 */
export async function handleDeployPhaseEnded(event: DeployPhaseEndedEvent): Promise<void> {
  const { roomId } = event;
  const room = db.getRoom(roomId);
  if (!room) return;

  // 处理超时未部署的玩家（使用随机部署）
  for (const player of room.players) {
    if (!player.isReady) {
      player.board = createRandomBoard();
      player.isReady = true;
      player.hasActed = true;
      console.log(`[EventBus] Auto-deploy for player ${player.userId}`);
    }
  }

  console.log(`[EventBus] Deploy phase ended in room ${roomId}`);
}

/**
 * 回合开始处理器
 */
export async function handleRoundStarted(event: RoundStartedEvent): Promise<void> {
  const { roomId, payload } = event;
  const { round } = payload;
  
  const room = db.getRoom(roomId);
  if (!room) return;

  room.currentRound = round;
  
  // 重置所有玩家的行动状态
  for (const player of room.players) {
    player.hasActed = false;
  }

  console.log(`[EventBus] Round ${round} started in room ${roomId}`);
}

/**
 * 行动阶段开始处理器
 */
export async function handleActionPhaseStarted(event: ActionPhaseStartedEvent): Promise<void> {
  const { roomId } = event;
  const room = db.getRoom(roomId);
  if (!room) return;

  const eventBus = getEventBus();

  // 获取活跃玩家（使用 getRoomPlayers 获取最新数据）
  const players = db.getRoomPlayers(roomId);
  const activePlayers = players.filter(p => p.isActive);
  
  if (activePlayers.length === 0) {
    console.log(`[EventBus] No active players in room ${roomId}`);
    return;
  }

  // 创建行动分叉
  const branches = activePlayers.map(player => ({
    branchId: `action_${player.userId}`,
    playerId: player.userId,
    type: 'action' as const,
  }));

  const splitId = await eventBus.createParallelSplit(
    roomId,
    branches,
    actionJoinCondition,
    EventType.SETTLEMENT_STARTED,
    ACTION_TIMEOUT,
    'action'
  );

  console.log(`[EventBus] Action phase started with split ${splitId}, active players: ${activePlayers.length}`);

  // 自动触发机器人行动（使用统一的 bot-service）
  scheduleAllBotActions(roomId, splitId);
}

/**
 * 玩家行动处理器
 */
export async function handlePlayerAction(event: PlayerActionEvent): Promise<void> {
  const { roomId, payload } = event;
  const { playerId, action, splitId, branchId } = payload;

  const room = db.getRoom(roomId);
  if (!room) return;

  const player = room.players.find(p => p.userId === playerId);
  if (!player || !player.isActive) return;

  // 验证行动合法性
  const isValid = validateAction(room, player, action);
  if (!isValid) {
    console.warn(`[EventBus] Invalid action from player ${playerId}`);
    return;
  }

  // 记录待执行行动（结算时统一执行）
  if (!room.pendingActions) {
    room.pendingActions = [];
  }
  
  room.pendingActions.push({
    playerId,
    action,
    order: room.turnOrder.indexOf(playerId),
  });

  player.hasActed = true;

  console.log(`[EventBus] Player ${playerId} acted in room ${roomId}:`, action);

  // 完成分支
  const eventBus = getEventBus();
  await eventBus.completeBranch(roomId, splitId, branchId, { action });
}

/**
 * 结算开始处理器
 */
export async function handleSettlementStarted(event: SettlementStartedEvent): Promise<void> {
  const { roomId } = event;
  const room = db.getRoom(roomId);
  if (!room) return;

  // 处理超时未行动的玩家（随机移动一个棋子）
  for (const player of room.players) {
    if (player.isActive && !player.hasActed) {
      const autoAction = generateAutoAction(player, room);
      if (autoAction && room.pendingActions) {
        room.pendingActions.push({
          playerId: player.userId,
          action: autoAction,
          order: room.turnOrder.indexOf(player.userId),
        });
        console.log(`[EventBus] Auto-action for player ${player.userId}`);
      }
    }
  }

  // 按turnOrder排序待执行行动
  if (room.pendingActions) {
    room.pendingActions.sort((a, b) => a.order - b.order);
  }

  // 执行所有行动
  await executePendingActions(room);

  // 执行公共区域对决
  const results = resolvePublicArea(room.publicArea);
  
  // 应用对决结果
  for (const result of results) {
    await applyDuelResult(room, result);
  }

  // 清空待执行行动
  room.pendingActions = [];

  console.log(`[EventBus] Settlement completed in room ${roomId}`);
}

/**
 * 检查额外回合处理器
 */
export async function handleCheckExtraTurn(event: CheckExtraTurnEvent): Promise<void> {
  const { roomId, payload } = event;
  const { publicArea } = payload;

  console.log(`[EventBus] Checking extra turn in room ${roomId}, public area: ${publicArea.length}`);
}

/**
 * 额外回合开始处理器
 */
export async function handleExtraTurnStarted(event: ExtraTurnStartedEvent): Promise<void> {
  const { roomId, payload } = event;
  const room = db.getRoom(roomId);
  if (!room) return;

  console.log(`[EventBus] Extra turn started in room ${roomId}`);
}

/**
 * 额外回合结束处理器
 */
export async function handleExtraTurnEnded(event: ExtraTurnEndedEvent): Promise<void> {
  const { roomId } = event;
  console.log(`[EventBus] Extra turn ended in room ${roomId}`);
}

/**
 * 回合结束处理器
 */
export async function handleRoundEnded(event: RoundEndedEvent): Promise<void> {
  const { roomId } = event;
  const room = db.getRoom(roomId);
  if (!room) return;

  // 检查游戏结束条件
  const activePlayers = room.players.filter(p => p.isActive);
  
  if (activePlayers.length <= 1) {
    // 触发游戏结束
    const eventBus = getEventBus();
    await eventBus.emit({
      id: generateId(),
      type: EventType.GAME_ENDED,
      roomId,
      timestamp: Date.now(),
      payload: {
        winnerId: activePlayers[0]?.userId,
        rankings: room.players
          .filter(p => p.isActive)
          .map(p => ({ playerId: p.userId, score: 0 })),
        reason: 'normal',
      },
    } as GameEndedEvent);
  }

  console.log(`[EventBus] Round ended in room ${roomId}`);
}

/**
 * 游戏结束处理器
 */
export async function handleGameEnded(event: GameEndedEvent): Promise<void> {
  const { roomId, payload } = event;
  const room = db.getRoom(roomId);
  if (!room) return;

  room.status = 'finished';
  
  console.log(`[EventBus] Game ended in room ${roomId}, winner: ${payload.winnerId}`);
}

/**
 * 机器人行动处理器 - 已弃用，现在通过 bot-service 直接调度
 * 
 * 保留此处理器以保持向后兼容性，但不再通过 BOT_ACTION 事件触发人机行动。
 * 现在人机行动通过 scheduleBotDeploy 和 scheduleBotAction 函数直接调用
 * executeDeploy 和 executeAction 服务函数来完成。
 */
export async function handleBotAction(event: BotActionEvent): Promise<void> {
  // 此处理器保留用于向后兼容，实际逻辑已移至 bot-service
  console.log(`[EventBus] BotAction event received (legacy): ${event.payload.botId}`);
}

/**
 * 验证行动合法性
 */
function validateAction(room: Room, player: Player, action: GameAction): boolean {
  if (action.type === 'move') {
    const { from, to } = action;
    const num = player.board[from];
    if (num === null) return false;

    const result = canMoveForward(player.board, from as CellId);
    if (!result.can) return false;

    const expectedTo = result.result === 'public' ? 'public' : result.result;
    return to === expectedTo;
  }
  
  return true;
}

/**
 * 执行待执行行动
 */
async function executePendingActions(room: Room): Promise<void> {
  if (!room.pendingActions || room.pendingActions.length === 0) return;

  for (const pending of room.pendingActions) {
    const player = room.players.find(p => p.userId === pending.playerId);
    if (!player || !player.isActive) continue;

    const { action } = pending;

    if (action.type === 'move') {
      const { from, to } = action;
      const num = player.board[from];
      
      if (num !== null) {
        // 从棋盘移除
        player.board[from] = null;
        
        if (to === 'public') {
          // 移动到公共区域
          room.publicArea.push({
            number: num,
            playerId: player.userId,
            nickname: player.nickname,
            cellId: from,
          });
        } else {
          // 移动到新的格子（前进）
          player.board[to] = num;
        }
      }
    }
  }
}

/**
 * 应用对决结果
 */
async function applyDuelResult(
  room: Room,
  result: { winner?: string; losers?: string[]; tied?: string[] }
): Promise<void> {
  // 处理失败者（棋子被淘汰）
  if (result.losers) {
    for (const loserId of result.losers) {
      const loser = room.players.find(p => p.userId === loserId);
      if (loser) {
        // 从公共区域移除该玩家的棋子
        const piece = room.publicArea.find(p => p.playerId === loserId);
        if (piece) {
          loser.eliminated.push(piece.number);
          room.publicArea = room.publicArea.filter(p => p.playerId !== loserId);
        }
      }
    }
  }

  // 处理平局（双方棋子都被淘汰）
  if (result.tied) {
    for (const playerId of result.tied) {
      const player = room.players.find(p => p.userId === playerId);
      if (player) {
        const piece = room.publicArea.find(p => p.playerId === playerId);
        if (piece) {
          player.eliminated.push(piece.number);
        }
      }
    }
    // 清空公共区域
    room.publicArea = [];
  }

  // 处理胜利者（棋子留在公共区域或回收）
  if (result.winner && !result.tied) {
    // 胜利者的棋子留在公共区域
    // 额外回合的处理在CHECK_EXTRA_TURN中
  }
}
