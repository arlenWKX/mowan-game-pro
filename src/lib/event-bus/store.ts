/**
 * 事件总线 - 内存存储实现
 * 
 * 基于现有的内存数据库实现
 */

import { BaseEvent, ActiveSplit, EventStore } from './types';

// 内存存储
const eventHistory: Map<string, BaseEvent[]> = new Map();
const activeSplits: Map<string, ActiveSplit> = new Map();

export class MemoryEventStore implements EventStore {
  async append(event: BaseEvent): Promise<void> {
    if (!eventHistory.has(event.roomId)) {
      eventHistory.set(event.roomId, []);
    }
    eventHistory.get(event.roomId)!.push(event);
  }

  async getHistory(roomId: string, since?: number): Promise<BaseEvent[]> {
    const events = eventHistory.get(roomId) || [];
    if (since) {
      return events.filter(e => e.timestamp >= since);
    }
    return [...events];
  }

  async getLastEvent(roomId: string): Promise<BaseEvent | null> {
    const events = eventHistory.get(roomId);
    if (!events || events.length === 0) {
      return null;
    }
    return events[events.length - 1];
  }

  async getActiveSplit(roomId: string): Promise<ActiveSplit | null> {
    const split = activeSplits.get(roomId);
    if (!split) return null;
    
    // 恢复Map对象（因为可能被序列化过）
    return {
      ...split,
      branches: new Map(split.branches),
    };
  }

  async saveActiveSplit(roomId: string, split: ActiveSplit | null): Promise<void> {
    if (split) {
      // 直接存储（内存存储不需要序列化）
      activeSplits.set(roomId, split);
    } else {
      activeSplits.delete(roomId);
    }
  }
}

// 导出单例
export const memoryEventStore = new MemoryEventStore();

// 清理函数（用于测试）
export function clearEventHistory(roomId?: string): void {
  if (roomId) {
    eventHistory.delete(roomId);
    activeSplits.delete(roomId);
  } else {
    eventHistory.clear();
    activeSplits.clear();
  }
}
