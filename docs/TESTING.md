# 魔丸小游戏 - 测试指南

## 快速测试

### 1. 自动测试脚本

我们提供了一个自动化的测试脚本，可以测试完整的游戏流程：

```bash
# 确保服务器已启动
npm run dev

# 在另一个终端运行测试
./test-game.sh

# 或者指定服务器地址
./test-game.sh http://localhost:3000
```

### 2. 手动测试步骤

如果你想手动测试游戏，请按照以下步骤操作：

#### 步骤 1: 准备工作

1. 启动开发服务器：
```bash
npm run dev
```

2. 打开浏览器访问 http://localhost:3000

#### 步骤 2: 单人 + 人机 测试

1. **注册/登录账号**
   - 访问 http://localhost:3000/register
   - 创建一个新账号

2. **创建房间**
   - 登录后进入房间列表
   - 点击"创建房间"
   - 设置最大玩家数为 3

3. **添加人机**
   - 在房间页面点击"添加人机"
   - 添加 2 个人机（总共3个玩家）

4. **观察部署状态**
   - 确认玩家列表显示：
     - 你自己："部署中..."
     - 人机："准备中..."
   - 确认有进度条显示准备进度

5. **部署棋盘**
   - 点击格子放置数字 0-9
   - 确认数字按顺序放置（0, 1, 2...）
   - 放置完所有10个数字后，点击"部署完成"

6. **等待状态检查**
   - 部署完成后，你应该看到：
     - 自己的状态变为"已准备"
     - 等待其他玩家的列表显示人机状态

7. **开始游戏**
   - 房主点击"开始游戏"
   - 确认游戏开始成功

8. **游戏进行测试**
   - 确认游戏界面显示：
     - 当前回合数
     - 公共区域
     - 自己的棋盘
     - 其他玩家的棋盘（隐藏数字）
     - 玩家状态（行动中/已行动/等待中）

9. **操作测试**
   - 如果是你的回合，点击棋子然后点击"前进"
   - 确认棋子移动到公共区域
   - 确认状态变为"已行动"

#### 步骤 3: 多人测试

1. **创建多个浏览器会话**
   - 使用浏览器的隐身模式
   - 或者使用不同的浏览器

2. **创建两个账号**
   - 账号 A（房主）
   - 账号 B（加入者）

3. **测试流程**
   - 账号 A 创建房间
   - 账号 B 加入房间
   - 双方确认能看到对方的准备状态
   - 双方都完成部署
   - 房主开始游戏
   - 双方轮流进行操作

## 常见问题排查

### 问题 1: "等待人机完成部署"卡住

**症状**: 游戏开始后一直显示等待人机

**检查点**:
1. 检查服务器日志是否有错误
2. 确认 `event-bus.ts` 文件存在且没有语法错误
3. 确认 `bot-service.ts` 能正确调度和执行人机操作

**调试方法**:
```bash
# 查看服务器日志
npm run dev

# 检查 API 响应
curl http://localhost:3000/api/rooms/YOUR_ROOM_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 问题 2: 玩家状态不更新

**症状**: 其他玩家部署完成但状态仍显示"部署中"

**检查点**:
1. 确认轮询间隔是否正常（默认2秒）
2. 检查网络请求是否正常
3. 查看浏览器控制台是否有错误

**调试方法**:
- 打开浏览器开发者工具
- 查看 Network 标签页的请求
- 查看 Console 标签页的错误

### 问题 3: 游戏无法开始

**症状**: 点击"开始游戏"没有反应

**检查点**:
1. 确认所有玩家（包括人机）都已准备
2. 确认玩家数量 >= 2
3. 检查服务器日志

## API 测试

### 使用 curl 测试

```bash
# 1. 登录获取 Token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 2. 创建房间
ROOM_ID=$(curl -s -X POST http://localhost:3000/api/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxPlayers":3}' \
  | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Room ID: $ROOM_ID"

# 3. 添加人机
curl -s -X POST "http://localhost:3000/api/rooms/$ROOM_ID/add-bot" \
  -H "Authorization: Bearer $TOKEN"

# 4. 部署棋盘
curl -s -X POST "http://localhost:3000/api/rooms/$ROOM_ID/ready" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "board": {
      "1A":0,"1B":1,"1C":2,"1D":3,"1E":4,"1F":5,
      "2A":6,"2B":7,"2C":8,"2D":9,"2E":null,"2F":null,
      "3A":null,"3B":null,"3C":null,"3D":null,"3E":null,"3F":null
    }
  }'

# 5. 开始游戏
curl -s -X POST "http://localhost:3000/api/rooms/$ROOM_ID/start" \
  -H "Authorization: Bearer $TOKEN"

# 6. 获取游戏状态
curl -s "http://localhost:3000/api/rooms/$ROOM_ID/state" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## 性能测试

### 测试大规模房间

```bash
# 创建5人房间并测试性能
for i in {1..5}; do
  curl -s -X POST "$API_URL/rooms" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"maxPlayers":5}' &
done
wait
```

## 调试工具

### 查看内存数据库状态

可以在代码中添加调试日志：

```typescript
// 在 src/lib/db.ts 中添加
public debugState(): void {
  console.log('=== DB Debug State ===')
  console.log('Rooms:', Array.from(this.rooms.entries()))
  console.log('Room Players:', Array.from(this.roomPlayers.entries()))
}
```

### 浏览器控制台调试

```javascript
// 在浏览器控制台中查看游戏状态
// 1. 获取当前房间ID
const roomId = window.location.pathname.split('/').pop()

// 2. 获取 Token
const token = localStorage.getItem('token')

// 3. 手动获取游戏状态
fetch(`/api/rooms/${roomId}/state`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log)
```

## 测试清单

### 部署阶段测试
- [ ] 可以正常放置数字
- [ ] 可以移除已放置的数字
- [ ] 数字按正确顺序放置 (0-9)
- [ ] 必须放置所有10个数字才能提交
- [ ] 提交后状态变为"已准备"
- [ ] 可以看到其他玩家的准备状态
- [ ] 人机显示"准备中"状态
- [ ] 进度条正确显示准备进度
- [ ] 房主只有在所有玩家准备后才能开始游戏

### 游戏阶段测试
- [ ] 游戏开始后显示正确回合数
- [ ] 能看到自己的完整棋盘
- [ ] 其他玩家棋盘只显示占用状态
- [ ] 能看到当前轮到哪位玩家
- [ ] 轮到自己时可以点击棋子
- [ ] 可以点击"前进"移动棋子
- [ ] 行动后状态变为"已行动"
- [ ] 公共区域正确显示棋子
- [ ] 所有玩家行动后进入结算

### 人机测试
- [ ] 人机会自动部署
- [ ] 人机会自动行动
- [ ] 人机状态正确显示
- [ ] 可以踢出人机

### 边界测试
- [ ] 房间满员时不能再加入
- [ ] 游戏开始后不能加入新玩家
- [ ] 玩家离开房间后状态正确更新
- [ ] 房主离开房间后游戏结束
