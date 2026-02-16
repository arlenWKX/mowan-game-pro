/**
 * 魔丸游戏 - 事件流定义
 * 
 * 定义游戏的事件拓扑结构：
 * - 部署阶段：并行分叉（所有玩家同时部署）
 * - 行动阶段：循环结构（回合循环 + 额外回合分支）
 * - 结算阶段：线性流转
 */

import { EventType, EventTransition, JoinCondition } from './types';
import { generateId } from '@/lib/utils';

/**
 * 魔丸游戏的事件流转规则
 * 
 * 流程图：
 * 
 * GAME_STARTED
 *      │
 *      ▼
 * DEPLOY_PHASE_STARTED
 *      │
 *      ▼
 * PARALLEL_SPLIT ──────┬────────┬────────┐
 * (部署分叉)            │        │        │
 *                      ▼        ▼        ▼
 *                PLAYER_DEPLOY  PLAYER_DEPLOY  PLAYER_DEPLOY
 *                (各玩家分支)    (各玩家分支)    (各玩家分支)
 *                      │        │        │
 *                      └────────┼────────┘
 *                               ▼
 *                         PARALLEL_JOIN
 *                         (部署汇合)
 *                               │
 *                               ▼
 *                    DEPLOY_PHASE_ENDED
 *                               │
 *                               ▼
 *                         ROUND_STARTED ◄──────────────────┐
 *                               │                          │
 *                               ▼                          │
 *                    ACTION_PHASE_STARTED                  │
 *                               │                          │
 *                               ▼                          │
 *                    PARALLEL_SPLIT ────┬────────┬───────┐ │
 *                    (行动分叉)          │        │       │ │
 *                                      ▼        ▼       ▼ │
 *                              PLAYER_ACTION  ...       ... │
 *                                      │        │       │   │
 *                                      └────────┼───────┘   │
 *                                               ▼           │
 *                                         PARALLEL_JOIN     │
 *                                         (行动汇合)         │
 *                                               │           │
 *                                               ▼           │
 *                                   SETTLEMENT_STARTED      │
 *                                               │           │
 *                                               ▼           │
 *                                   SETTLEMENT_ENDED        │
 *                                               │           │
 *                                               ▼           │
 *                                   CHECK_EXTRA_TURN ──是───┤
 *                                               │否         │
 *                                               ▼           │
 *                                   ROUND_ENDED             │
 *                                               │           │
 *                                               ▼           │
 *                                   GAME_ENDED (或循环)      │
 */

export function createMowanFlowTransitions(): EventTransition[] {
  return [
    // 1. 游戏开始 -> 部署阶段开始
    {
      from: EventType.GAME_STARTED,
      to: EventType.DEPLOY_PHASE_STARTED,
    },

    // 2. 部署阶段开始 -> 并行部署分叉（在handler中手动触发）
    // 这里不自动流转，由DEPLOY_PHASE_STARTED的handler调用createParallelSplit

    // 3. 部署汇合 -> 部署阶段结束
    {
      from: EventType.PARALLEL_JOIN,
      to: EventType.DEPLOY_PHASE_ENDED,
      guard: async (context) => {
        // 检查是否是部署阶段的汇合
        const lastEvent = context.eventHistory[context.eventHistory.length - 1];
        if (lastEvent?.type === EventType.PARALLEL_JOIN) {
          const payload = lastEvent.payload as { splitId: string };
          // 通过splitId前缀来判断阶段
          return payload.splitId.startsWith('deploy_');
        }
        return false;
      },
    },

    // 4. 部署阶段结束 -> 回合开始
    {
      from: EventType.DEPLOY_PHASE_ENDED,
      to: EventType.ROUND_STARTED,
      transform: async (event, context) => ({
        ...event,
        id: generateId(),
        type: EventType.ROUND_STARTED,
        payload: {
          round: 1,
          turnOrder: context.gameState.turnOrder,
          activePlayers: context.gameState.activePlayers,
        },
      }),
    },

    // 5. 回合开始 -> 行动阶段开始
    {
      from: EventType.ROUND_STARTED,
      to: EventType.ACTION_PHASE_STARTED,
    },

    // 6. 行动阶段开始 -> 并行行动分叉（在handler中手动触发）

    // 7. 行动汇合 -> 结算开始
    {
      from: EventType.PARALLEL_JOIN,
      to: EventType.SETTLEMENT_STARTED,
      guard: async (context) => {
        const lastEvent = context.eventHistory[context.eventHistory.length - 1];
        if (lastEvent?.type === EventType.PARALLEL_JOIN) {
          const payload = lastEvent.payload as { splitId: string };
          // 通过splitId前缀来判断阶段
          return payload.splitId.startsWith('action_');
        }
        return false;
      },
    },

    // 8. 结算开始 -> 结算结束
    {
      from: EventType.SETTLEMENT_STARTED,
      to: EventType.SETTLEMENT_ENDED,
    },

    // 9. 结算结束 -> 检查额外回合
    {
      from: EventType.SETTLEMENT_ENDED,
      to: EventType.CHECK_EXTRA_TURN,
    },

    // 10. 检查额外回合 -> 额外回合开始（条件：有额外回合）
    {
      from: EventType.CHECK_EXTRA_TURN,
      to: EventType.EXTRA_TURN_STARTED,
      guard: async (context) => {
        // 检查公共区域是否只剩一个棋子
        const publicArea = context.gameState.publicArea;
        return publicArea.length === 1;
      },
    },

    // 11. 检查额外回合 -> 回合结束（条件：无额外回合）
    {
      from: EventType.CHECK_EXTRA_TURN,
      to: EventType.ROUND_ENDED,
      guard: async (context) => {
        const publicArea = context.gameState.publicArea;
        return publicArea.length !== 1;
      },
    },

    // 12. 额外回合结束 -> 结算开始（额外回合后也要结算）
    {
      from: EventType.EXTRA_TURN_ENDED,
      to: EventType.SETTLEMENT_STARTED,
    },

    // 13. 回合结束 -> 下一回合开始（循环）或游戏结束
    {
      from: EventType.ROUND_ENDED,
      to: EventType.ROUND_STARTED,
      guard: async (context) => {
        // 检查游戏是否结束（有玩家获胜或达到最大回合）
        const activePlayers = context.gameState.activePlayers;
        return activePlayers.length >= 2 && context.gameState.round < 100;
      },
      transform: async (event, context) => ({
        ...event,
        id: generateId(),
        type: EventType.ROUND_STARTED,
        payload: {
          round: context.gameState.round + 1,
          turnOrder: context.gameState.turnOrder,
          activePlayers: context.gameState.activePlayers,
        },
      }),
    },

    // 14. 回合结束 -> 游戏结束
    {
      from: EventType.ROUND_ENDED,
      to: EventType.GAME_ENDED,
      guard: async (context) => {
        const activePlayers = context.gameState.activePlayers;
        return activePlayers.length < 2 || context.gameState.round >= 100;
      },
    },
  ];
}

/**
 * 部署阶段的汇合条件：所有玩家都完成部署
 */
export const deployJoinCondition: JoinCondition = { type: 'all' };

/**
 * 行动阶段的汇合条件：所有活跃玩家都完成行动
 */
export const actionJoinCondition: JoinCondition = { type: 'all' };

/**
 * 部署阶段超时：60秒
 */
export const DEPLOY_TIMEOUT = 60000;

/**
 * 行动阶段超时：60秒
 */
export const ACTION_TIMEOUT = 60000;
