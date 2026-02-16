# 魔丸游戏 - 事件总线架构设计

## 一、核心设计理念

### 1.1 什么是事件总线？

事件总线是将游戏逻辑抽象为**事件流（Event Stream）**的架构模式：

- **事件（Event）**：游戏状态的原子变更（如"玩家A行动"、"回合结算"）
- **流转（Transition）**：事件间的有向连接，决定"接下来发生什么"
- **守卫（Guard）**：条件判断，决定走哪条分支
- **钩子（Hook）**：允许外部在特定时机插入逻辑

### 1.2 与传统架构的对比

```
【传统 MVC 模式】
Controller → Service → Database → Response
     ↑___________________________|

【事件总线模式】
EventA ──► EventB ──┬──► EventC ──► EventD
               │     │
               └──► EventE (条件分支)
               │
               └──► [Hook: 记录日志] → 继续
```

## 二、魔丸游戏事件拓扑图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           游戏生命周期                                   │
└─────────────────────────────────────────────────────────────────────────┘

【房间创建】
    │
    ▼
┌─────────────┐
│ ROOM_CREATED│ ──► [Hook: 通知所有玩家]
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ PLAYER_JOIN │ ──► │ PLAYER_JOIN │ ──► ... (动态分叉)
│   (玩家A)   │     │   (玩家B)   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ▼
       ┌─────────────────┐
       │  ALL_JOINED?    │ ──否──► 等待更多玩家
       │   (守卫节点)     │
       └────────┬────────┘
                │ 是
                ▼
       ┌─────────────────┐
       │  GAME_START     │ ──► [Hook: 部署阶段计时器]
       └────────┬────────┘
                │
                ▼

【部署阶段 - 并行分叉】
       ┌───────────────────────────────────────┐
       │           PARALLEL_SPLIT              │
       │         (并行分叉节点)                 │
       └────────┬────────┬────────┬────────────┘
                │        │        │
                ▼        ▼        ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │ DEPLOY_A │ │ DEPLOY_B │ │ DEPLOY_C │ ... (每个玩家一个分支)
       │ 并行部署  │ │ 并行部署  │ │ 并行部署  │
       └────┬─────┘ └────┬─────┘ └────┬─────┘
            │            │            │
            └────────────┼────────────┘
                         ▼
            ┌──────────────────────────┐
            │    PARALLEL_JOIN         │  (所有玩家完成才继续)
            │    (并行汇合节点)         │
            └───────────┬──────────────┘
                        │
                        ▼

【行动阶段 - 回合循环】
            ┌─────────────────┐
     ┌─────►│   ROUND_START   │ ◄────────────────┐
     │      │   (回合开始)     │                  │
     │      └────────┬────────┘                  │
     │               │                           │
     │               ▼                           │
     │      ┌─────────────────┐                  │
     │      │ PARALLEL_SPLIT  │                  │
     │      └────────┬────────┘                  │
     │               │                           │
     │     ┌─────────┼─────────┐                 │
     │     ▼         ▼         ▼                 │
     │  ┌─────┐  ┌─────┐  ┌─────┐               │
     │  │ACT_A│  │ACT_B│  │ACT_C│  ... (每个活跃玩家)
     │  │行动 │  │行动 │  │行动 │               │
     │  └──┬──┘  └──┬──┘  └──┬──┘               │
     │     │        │        │                   │
     │     └────────┼────────┘                   │
     │              ▼                            │
     │     ┌─────────────────┐                   │
     │     │  PARALLEL_JOIN  │                   │
     │     │  (汇合等待)      │                   │
     │     └────────┬────────┘                   │
     │              │                            │
     │              ▼                            │
     │     ┌─────────────────┐                   │
     │     │   SETTLEMENT    │ ──► [Hook: 计算胜负]
     │     │   (结算事件)     │ ──► [Hook: 更新排行榜]
     │     └────────┬────────┘                   │
     │              │                            │
     │              ▼                            │
     │     ┌─────────────────┐                   │
     │     │   CHECK_EXTRA   │                   │
     │     │  (检查额外回合)   │                   │
     │     └────────┬────────┘                   │
     │           是/│                            │
     │    ┌────────┘                             │
     │    ▼                                      │
     │ ┌─────────────────┐                       │
     │ │   EXTRA_TURN    │ ──────────────────────┘
     │ │  (额外回合分支)  │
     │ └─────────────────┘
     │
     │    否
     │    └──────────────────────────────────────►
                                                  │
【游戏结束】                                      │
                                                  ▼
                                         ┌─────────────────┐
                                         │   GAME_OVER     │
                                         │   (游戏结束)     │
                                         └─────────────────┘
```

## 三、事件类型定义

### 3.1 基础事件类型

```typescript
// 事件基类
interface BaseEvent {
  id: string;           // 唯一标识
  type: EventType;      // 事件类型
  timestamp: number;    // 创建时间
  roomId: string;       // 所属房间
  payload?: unknown;    // 事件数据
}

// 事件类型枚举
enum EventType {
  // 房间生命周期
  ROOM_CREATED = 'ROOM_CREATED',
  PLAYER_JOIN = 'PLAYER_JOIN',
  PLAYER_LEAVE = 'PLAYER_LEAVE',
  GAME_START = 'GAME_START',
  
  // 部署阶段
  PARALLEL_SPLIT = 'PARALLEL_SPLIT',  // 分叉开始
  DEPLOY = 'DEPLOY',                   // 单个玩家部署
  PARALLEL_JOIN = 'PARALLEL_JOIN',     // 分叉汇合
  
  // 行动阶段
  ROUND_START = 'ROUND_START',
  PLAYER_ACTION = 'PLAYER_ACTION',     // 玩家行动
  SETTLEMENT = 'SETTLEMENT',           // 结算
  CHECK_EXTRA_TURN = 'CHECK_EXTRA_TURN',
  EXTRA_TURN = 'EXTRA_TURN',
  
  // 游戏结束
  GAME_OVER = 'GAME_OVER',
  
  // 系统事件
  TIMEOUT = 'TIMEOUT',
  ERROR = 'ERROR',
}
```

### 3.2 分叉/汇合事件（核心创新）

```typescript
// 并行分叉 - 将一个事件分成多个并行分支
interface ParallelSplitEvent extends BaseEvent {
  type: EventType.PARALLEL_SPLIT;
  payload: {
    branches: string[];        // 分支ID列表 (如 ['deploy_A', 'deploy_B'])
    joinCondition: 'all' | 'any' | number;  // 汇合条件
    timeout?: number;          // 超时时间
  };
}

// 并行汇合 - 等待多个分支完成后继续
interface ParallelJoinEvent extends BaseEvent {
  type: EventType.PARALLEL_JOIN;
  payload: {
    parentSplitId: string;     // 对应的分叉事件ID
    completedBranches: string[];  // 已完成的分支
    timedOut: boolean;         // 是否超时
  };
}
```

## 四、事件总线核心实现

### 4.1 总线引擎

```typescript
class EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  private eventQueue: BaseEvent[] = [];
  private activeTransitions: Map<string, ActiveTransition> = new Map();
  
  // 订阅事件
  on<T extends BaseEvent>(type: EventType, handler: EventHandler<T>) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }
  
  // 发布事件
  async emit<T extends BaseEvent>(event: T) {
    // 1. 记录事件
    await this.persistEvent(event);
    
    // 2. 执行处理器
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      await handler(event);
    }
    
    // 3. 自动流转到下一个事件
    await this.autoTransition(event);
  }
  
  // 自动流转逻辑
  private async autoTransition(event: BaseEvent) {
    const transition = this.getTransition(event);
    if (transition) {
      await this.executeTransition(event, transition);
    }
  }
}
```

### 4.2 分叉/汇合实现（关键）

```typescript
// 处理分叉事件
async handleParallelSplit(event: ParallelSplitEvent) {
  const { branches, joinCondition, timeout } = event.payload;
  
  // 创建活跃分叉记录
  this.activeTransitions.set(event.id, {
    type: 'parallel',
    branches: new Set(branches),
    completed: new Set(),
    joinCondition,
    startTime: Date.now(),
    timeout,
  });
  
  // 并行发出所有分支事件
  const branchEvents = branches.map(branchId => 
    this.createBranchEvent(event, branchId)
  );
  
  await Promise.all(branchEvents.map(e => this.emit(e)));
  
  // 设置超时检查
  if (timeout) {
    setTimeout(() => this.checkTimeout(event.id), timeout);
  }
}

// 处理分支完成
async completeBranch(splitId: string, branchId: string) {
  const transition = this.activeTransitions.get(splitId);
  if (!transition) return;
  
  transition.completed.add(branchId);
  
  // 检查汇合条件
  const shouldJoin = this.checkJoinCondition(transition);
  
  if (shouldJoin) {
    this.activeTransitions.delete(splitId);
    
    // 发出汇合事件
    await this.emit({
      id: generateId(),
      type: EventType.PARALLEL_JOIN,
      timestamp: Date.now(),
      roomId: transition.roomId,
      payload: {
        parentSplitId: splitId,
        completedBranches: Array.from(transition.completed),
        timedOut: false,
      },
    });
  }
}
```

## 五、魔丸游戏具体实现

### 5.1 部署阶段事件流

```typescript
// 游戏开始 -> 并行部署
async function onGameStart(event: GameStartEvent) {
  const room = await db.getRoom(event.roomId);
  const playerIds = room.players.map(p => p.userId);
  
  // 创建分叉事件
  await eventBus.emit({
    id: generateId(),
    type: EventType.PARALLEL_SPLIT,
    timestamp: Date.now(),
    roomId: event.roomId,
    payload: {
      branches: playerIds.map(id => `deploy_${id}`),
      joinCondition: 'all',  // 所有玩家都完成
      timeout: 30000,        // 30秒超时
    },
  });
}

// 单个玩家部署
async function onDeploy(event: DeployEvent) {
  const { playerId, board } = event.payload;
  
  // 保存部署
  await db.updatePlayerBoard(event.roomId, playerId, board);
  
  // 标记分支完成
  const splitId = getCurrentSplit(event.roomId);
  await eventBus.completeBranch(splitId, `deploy_${playerId}`);
}

// 所有玩家部署完成
async function onParallelJoin(event: ParallelJoinEvent) {
  // 自动进入第一回合
  await eventBus.emit({
    id: generateId(),
    type: EventType.ROUND_START,
    timestamp: Date.now(),
    roomId: event.roomId,
    payload: { round: 1 },
  });
}
```

### 5.2 行动阶段事件流（核心）

```typescript
// 回合开始 -> 并行行动
async function onRoundStart(event: RoundStartEvent) {
  const room = await db.getRoom(event.roomId);
  const activePlayers = room.players.filter(p => p.isActive);
  
  await eventBus.emit({
    id: generateId(),
    type: EventType.PARALLEL_SPLIT,
    timestamp: Date.now(),
    roomId: event.roomId,
    payload: {
      branches: activePlayers.map(p => `action_${p.userId}`),
      joinCondition: 'all',
      timeout: 60000,  // 60秒行动时间
    },
  });
}

// 玩家行动
async function onPlayerAction(event: PlayerActionEvent) {
  const { playerId, action } = event.payload;
  
  // 验证行动合法性
  const validation = await validateAction(event.roomId, playerId, action);
  if (!validation.valid) {
    throw new GameError(validation.error);
  }
  
  // 执行行动（但状态变更延迟到结算阶段）
  await db.recordPendingAction(event.roomId, playerId, action);
  
  // 标记分支完成
  const splitId = getCurrentSplit(event.roomId);
  await eventBus.completeBranch(splitId, `action_${playerId}`);
}

// 所有玩家行动完成 -> 结算
async function onActionPhaseComplete(event: ParallelJoinEvent) {
  await eventBus.emit({
    id: generateId(),
    type: EventType.SETTLEMENT,
    timestamp: Date.now(),
    roomId: event.roomId,
  });
}
```

### 5.3 结算阶段

```typescript
async function onSettlement(event: SettlementEvent) {
  const room = await db.getRoom(event.roomId);
  const pendingActions = await db.getPendingActions(event.roomId);
  
  // 1. 应用所有行动
  for (const action of pendingActions) {
    await applyAction(room, action);
  }
  
  // 2. 执行公共区域对决
  const publicArea = room.publicArea;
  const results = resolveDuels(publicArea);
  
  // 3. 应用对决结果
  for (const result of results) {
    await applyDuelResult(room, result);
  }
  
  // 4. 清空待执行行动
  await db.clearPendingActions(event.roomId);
  
  // 5. 检查是否触发额外回合
  await eventBus.emit({
    id: generateId(),
    type: EventType.CHECK_EXTRA_TURN,
    timestamp: Date.now(),
    roomId: event.roomId,
    payload: { publicAreaAfter: room.publicArea },
  });
}
```

### 5.4 额外回合判断

```typescript
async function onCheckExtraTurn(event: CheckExtraTurnEvent) {
  const { publicAreaAfter } = event.payload;
  
  // 规则：公共区域只剩一个棋子时，触发额外回合
  if (publicAreaAfter.length === 1) {
    const survivingPiece = publicAreaAfter[0];
    const survivingPlayer = survivingPiece.playerId;
    
    await eventBus.emit({
      id: generateId(),
      type: EventType.EXTRA_TURN,
      timestamp: Date.now(),
      roomId: event.roomId,
      payload: {
        type: '回收',  // 或 '单挑'，根据规则判断
        beneficiary: survivingPlayer,
        piece: survivingPiece,
      },
    });
  } else {
    // 正常进入下一回合
    await eventBus.emit({
      id: generateId(),
      type: EventType.ROUND_START,
      timestamp: Date.now(),
      roomId: event.roomId,
      payload: { round: getNextRound(event.roomId) },
    });
  }
}
```

## 六、动态修改流程图

事件总线的强大之处在于**可以运行时修改流程**。

### 6.1 示例：增加投票踢人功能

```typescript
// 在任意时刻插入投票事件
async function insertVoteEvent(roomId: string, targetPlayer: string) {
  const currentEvent = await eventBus.getCurrentEvent(roomId);
  
  // 暂停当前流程
  await eventBus.pause(roomId);
  
  // 插入投票分叉
  await eventBus.emit({
    id: generateId(),
    type: EventType.PARALLEL_SPLIT,
    timestamp: Date.now(),
    roomId,
    payload: {
      branches: ['vote_yes', 'vote_no'],
      joinCondition: 'any',  // 任意玩家投票即结束
      timeout: 30000,
    },
  });
  
  // 投票完成后恢复
  eventBus.on(EventType.PARALLEL_JOIN, async (e) => {
    if (e.roomId === roomId) {
      await handleVoteResult(e);
      await eventBus.resume(roomId, currentEvent.id);
    }
  });
}
```

### 6.2 示例：增加断线重连

```typescript
// 玩家断线时，自动转为AI托管
async function onPlayerDisconnect(event: PlayerDisconnectEvent) {
  const { playerId, roomId } = event.payload;
  
  // 检查当前是否有活跃分叉
  const activeSplit = await eventBus.getActiveSplit(roomId);
  
  if (activeSplit) {
    // 检查该玩家是否需要行动
    const branchId = `action_${playerId}`;
    if (activeSplit.branches.has(branchId)) {
      // 启动AI托管
      const aiAction = await generateAIAction(roomId, playerId);
      
      // 自动完成该分支
      await eventBus.emit({
        id: generateId(),
        type: EventType.PLAYER_ACTION,
        timestamp: Date.now(),
        roomId,
        payload: {
          playerId,
          action: aiAction,
          isAI: true,  // 标记为AI行动
        },
      });
    }
  }
}
```

## 七、可视化调试

事件总线天然支持流程可视化：

```typescript
// 导出当前流程图（用于前端展示）
async function exportFlow(roomId: string): Promise<FlowGraph> {
  const events = await db.getEventHistory(roomId);
  const activeTransitions = eventBus.getActiveTransitions(roomId);
  
  return {
    nodes: events.map(e => ({
      id: e.id,
      type: e.type,
      status: getNodeStatus(e),
      timestamp: e.timestamp,
    })),
    edges: buildEdges(events),
    activeBranches: Array.from(activeTransitions.values()),
  };
}
```

前端可以渲染实时流程图：

```
┌─────────────────────────────────────────┐
│         房间 #12345 事件流程             │
├─────────────────────────────────────────┤
│                                         │
│  ● ROOM_CREATED ──► ● GAME_START        │
│       ✓                  ✓              │
│                      │                  │
│                      ▼                  │
│          ┌─────────────────┐            │
│          │ PARALLEL_SPLIT  │ ◄── 当前   │
│          │    (部署中)      │            │
│          └────────┬────────┘            │
│                   │                     │
│         ┌────────┼────────┐             │
│         ▼        ▼        ▼             │
│      ┌────┐   ┌────┐   ┌────┐          │
│      │ A  │   │ B  │   │ C  │          │
│      │ ●  │   │ ●  │   │ ⏳ │          │
│      └────┘   └────┘   └────┘          │
│      (完成)   (完成)   (等待)           │
│                                         │
└─────────────────────────────────────────┘
```

## 八、总结

### 事件总线的优势

1. **代码解耦**：每个事件处理器只关注自己的逻辑
2. **易于扩展**：新增功能 = 新增事件处理器
3. **天然并发**：分叉/汇合模型完美契合魔丸的"同时行动"规则
4. **可观测性**：完整的事件历史 = 完美的复盘/调试能力
5. **灵活可变**：运行时修改流程图，支持特殊规则/活动

### 实现路线图

```
Phase 1: 基础事件总线
  - EventBus 类
  - 基础事件类型
  - 持久化存储

Phase 2: 分叉/汇合
  - ParallelSplit/ParallelJoin
  - 超时处理
  - 条件分支

Phase 3: 魔丸游戏迁移
  - 部署阶段并行化
  - 行动阶段并行化
  - 结算事件

Phase 4: 高级特性
  - 可视化调试
  - 动态流程修改
  - AI托管集成
```
