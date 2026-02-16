/**
 * 事件总线 - 入口模块
 * 
 * 导出所有事件总线相关的类型和函数
 */

export * from './types';
export { EventBus, createEventBus, getEventBus } from './engine';
export { MemoryEventStore, memoryEventStore, clearEventHistory } from './store';
export { createMowanFlowTransitions, deployJoinCondition, actionJoinCondition, DEPLOY_TIMEOUT, ACTION_TIMEOUT } from './flow';
export {
  handleGameStarted,
  handleDeployPhaseStarted,
  handlePlayerDeploy,
  handleDeployPhaseEnded,
  handleRoundStarted,
  handleActionPhaseStarted,
  handlePlayerAction,
  handleSettlementStarted,
  handleCheckExtraTurn,
  handleExtraTurnStarted,
  handleExtraTurnEnded,
  handleRoundEnded,
  handleGameEnded,
  handleBotAction,
} from './handlers';

import { EventBus, createEventBus } from './engine';
import { memoryEventStore } from './store';
import { createMowanFlowTransitions } from './flow';
import {
  handleGameStarted,
  handleDeployPhaseStarted,
  handlePlayerDeploy,
  handleDeployPhaseEnded,
  handleRoundStarted,
  handleActionPhaseStarted,
  handlePlayerAction,
  handleSettlementStarted,
  handleCheckExtraTurn,
  handleExtraTurnStarted,
  handleExtraTurnEnded,
  handleRoundEnded,
  handleGameEnded,
  handleBotAction,
} from './handlers';
import { EventType } from './types';

/**
 * 初始化事件总线
 * 
 * 注册所有事件处理器和流转规则
 */
export function initializeEventBus(): EventBus {
  const eventBus = createEventBus({
    store: memoryEventStore,
    enableLogging: process.env.NODE_ENV === 'development',
    defaultTimeout: 60000,
  });

  // 注册事件处理器
  eventBus.on(EventType.GAME_STARTED, handleGameStarted);
  eventBus.on(EventType.DEPLOY_PHASE_STARTED, handleDeployPhaseStarted);
  eventBus.on(EventType.PLAYER_DEPLOY, handlePlayerDeploy);
  eventBus.on(EventType.DEPLOY_PHASE_ENDED, handleDeployPhaseEnded);
  eventBus.on(EventType.ROUND_STARTED, handleRoundStarted);
  eventBus.on(EventType.ACTION_PHASE_STARTED, handleActionPhaseStarted);
  eventBus.on(EventType.PLAYER_ACTION, handlePlayerAction);
  eventBus.on(EventType.SETTLEMENT_STARTED, handleSettlementStarted);
  eventBus.on(EventType.CHECK_EXTRA_TURN, handleCheckExtraTurn);
  eventBus.on(EventType.EXTRA_TURN_STARTED, handleExtraTurnStarted);
  eventBus.on(EventType.EXTRA_TURN_ENDED, handleExtraTurnEnded);
  eventBus.on(EventType.ROUND_ENDED, handleRoundEnded);
  eventBus.on(EventType.GAME_ENDED, handleGameEnded);
  eventBus.on(EventType.BOT_ACTION, handleBotAction);

  // 注册流转规则
  const transitions = createMowanFlowTransitions();
  eventBus.registerTransitions(transitions);

  return eventBus;
}
