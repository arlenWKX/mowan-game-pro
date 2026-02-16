# 魔丸小游戏 (Mowan Game)

## 项目概述

魔丸小游戏是一款基于 Next.js 14 开发的全栈策略推理类棋类游戏，支持 2-5 人在线对战。游戏采用独特的反向排序对决规则，玩家需要运用策略部署数字棋子并击败对手。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript 5.3+
- **样式**: Tailwind CSS 3.4
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **图标**: lucide-react
- **工具库**: clsx, tailwind-merge, class-variance-authority

## 项目结构

```
src/
  app/                    # Next.js App Router
    page.tsx              # 首页
    layout.tsx            # 根布局
    globals.css           # 全局样式和 CSS 变量
    
    # 页面路由
    login/page.tsx        # 登录页
    register/page.tsx     # 注册页
    rooms/page.tsx        # 房间列表
    room/[id]/page.tsx    # 游戏房间页
    leaderboard/page.tsx  # 排行榜
    rules/page.tsx        # 游戏规则
    offline/page.tsx      # 离线模式（新手教学）
    admin/page.tsx        # 管理后台
    
    # API 路由
    api/auth/             # 认证相关 API
    api/rooms/            # 房间管理 API
    api/leaderboard/      # 排行榜 API
    api/admin/            # 管理员 API
    
  components/             # React 组件
    ui/                   # shadcn/ui 基础组件
    game-board.tsx        # 游戏棋盘组件
    number-palette.tsx    # 数字选择板
    header.tsx            # 顶部导航栏
    toaster.tsx           # 消息提示组件
    
  lib/                    # 工具库和业务逻辑
    utils.ts              # 通用工具函数和游戏核心逻辑
    auth.ts               # JWT 认证相关
    db.ts                 # 内存数据库
    
  types/                  # TypeScript 类型定义
    index.ts              # 所有类型定义
```

## 可用命令

```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

开发服务器默认在 http://localhost:3000 启动。

## 服务管理脚本 (manage.sh)

项目提供 `manage.sh` 脚本用于管理系统服务（基于 systemd）：

```bash
# 安装服务（首次部署，创建 systemd 服务和全局命令）
./manage.sh install

# 卸载服务（移除 systemd 服务和全局命令）
./manage.sh uninstall

# 显示帮助信息
./manage.sh help

# 启动服务
./manage.sh start

# 停止服务
./manage.sh stop

# 强制停止服务（终止进程并检查端口释放）
./manage.sh stop -f
./manage.sh stop --force

# 重启服务
./manage.sh restart

# 强制重启（强制停止后再启动）
./manage.sh restart -f
./manage.sh restart --force

# 重新加载（构建后重启，确保应用最新代码）
./manage.sh reload

# 重新构建项目
./manage.sh build

# 清理缓存后重新构建（强制完整重建）
./manage.sh build -f
./manage.sh build --force

# 清理构建缓存（仅清理，不构建）
./manage.sh clean

# 查看服务状态（显示运行状态、端口、构建信息）
./manage.sh status

# 健康检查（检验服务器功能是否正常）
./manage.sh health

# 查看实时日志 (按 Ctrl+C 退出)
./manage.sh logs
```

**首次部署流程**：

```bash
# 1. 克隆项目
git clone <repository-url> /root/mowan-game-pro
cd /root/mowan-game-pro

# 2. 安装服务（会自动安装依赖、构建项目、创建服务和全局命令）
./manage.sh install

# 3. 安装完成后，可以在任意位置使用 mowan 命令
mowan status
mowan logs
```

**日常使用流程**：

```bash
# 快速构建并应用更新
mowan build && mowan reload

# 完整清理重建并应用更新
mowan build -f && mowan reload

# 仅清理缓存（不构建）
mowan clean

# 强制停止服务（解决端口占用问题）
mowan stop -f

# 查看服务状态
mowan status

# 健康检查
mowan health

# 查看实时日志
mowan logs
```

**卸载服务**：

```bash
# 卸载服务（会询问是否删除构建文件）
mowan uninstall
```

## 配置文件 (config.ini)

项目使用 `config.ini` 作为配置文件，位于项目根目录：

```ini
[server]
# 服务端口
port=3000

[admin]
# 管理员账户配置
username=admin
password=admin123

[log]
# 日志级别: debug, info, warn, error
level=info
```

**配置说明**：
- 修改配置后需要重启服务才能生效
- 管理员账户用于登录管理后台
- 生产环境请务必修改默认密码
- 端口配置会被 manage.sh 和 systemd 服务同时读取

## 启动脚本 (start.sh)

`start.sh` 是 systemd 服务使用的启动脚本，负责读取 `config.ini` 中的配置并启动服务：
- 自动读取 `config.ini` 中的端口配置
- 设置必要的环境变量
- 启动 Next.js 应用

**注意**: 该脚本由 systemd 服务自动调用，通常不需要手动执行。

## 代码规范

### TypeScript 配置

- 严格模式启用 (`"strict": true`)
- 路径别名 `@/*` 映射到 `./src/*`
- 模块解析使用 bundler 模式
- JSX 保留模式（由 Next.js 处理）

### 样式规范

- 使用 Tailwind CSS 工具类
- 深色主题设计（基于 CSS 变量）
- 组件样式使用 `cn()` 工具函数合并类名
- 自定义动画定义在 `globals.css`

### 组件开发规范

1. **UI 组件** (shadcn/ui):
   - 位于 `src/components/ui/`
   - 使用 `cva` (class-variance-authority) 管理变体
   - 基于 Radix UI 实现无障碍支持
   - 通过 `Slot` 支持 `asChild` 模式

2. **游戏组件**:
   - 使用 `"use client"` 指令标记客户端组件
   - Props 接口命名：`{ComponentName}Props`
   - 支持 `readonly` 和 `size` 等常用属性

### API 开发规范

1. **路由处理器**:
   - 使用 `NextRequest` 和 `NextResponse`
   - 统一错误响应格式：`{ error: string }`
   - 认证使用 Bearer Token 格式

2. **状态码规范**:
   - 200: 成功
   - 201: 创建成功
   - 400: 请求参数错误
   - 401: 未授权
   - 403: 禁止访问
   - 404: 资源不存在
   - 500: 服务器内部错误

## 数据模型

### User (用户)
```typescript
interface User {
  id: string
  username: string
  nickname: string
  isAdmin: boolean
  wins: number
  losses: number
  totalGames: number
}
```

### Room (房间)
```typescript
interface Room {
  id: string
  creatorId: string
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  currentRound: number
  currentTurn: number
  turnOrder: string[]
  publicArea: { number: number; playerId: string }[]
  players: Player[]
  createdAt: string
}
```

### Player (玩家)
```typescript
interface Player {
  userId: string
  username: string
  nickname: string
  order: number
  board: Record<string, number | null>
  eliminated: number[]
  isReady: boolean
  isActive: boolean
}
```

## 认证系统

- 使用 JWT 进行无状态认证
- Token 有效期：7 天
- 默认密钥：`mowan-jwt-secret-key-2024`（生产环境应通过环境变量覆盖）
- Token 存储：客户端 localStorage
- 受保护路由需在请求头携带：`Authorization: Bearer {token}`

## 数据库

当前使用内存数据库（`src/lib/db.ts`），特点：
- 单例模式实现
- 数据在服务器重启后丢失
- 生产环境应替换为真实数据库（如 PostgreSQL、MongoDB）

主要方法：
- `createUser()` / `getUserById()` / `getUserByUsername()`
- `createRoom()` / `getRoom()` / `joinRoom()` / `leaveRoom()`
- `updatePlayerBoard()` / `updateRoomStatus()`
- `getLeaderboard()`

## 游戏核心逻辑

### 棋盘结构
- 3 行 × 6 列网格
- 坐标格式：`{行号}{列号}`，如 `1A`、`2B`、`3F`
- 行号 1-3（1 为最前列）
- 列号 A-F

### 对决规则 (`src/lib/utils.ts`)

特殊规则（按优先级）：
1. 相同数字 → 同归于尽
2. 0 vs 6/9 → 同归于尽
3. 8 > 0（8 击败 0）

一般规则：
- 反向排序，小数字获胜
- 0 > 1 > 2 > 3 > 4 > 5 > 6 > 7 > 8 > 9

### 游戏流程 API

1. **部署阶段**: 玩家将数字 0-9 填入棋盘
2. **开始游戏**: `POST /api/rooms/[id]/start`
3. **获取状态**: `GET /api/rooms/[id]/state`
4. **执行行动**: 通过 WebSocket 或轮询实现（当前实现需根据代码确认）

## 默认账号

- **管理员**: `admin` / `admin123`

## 安全注意事项

1. **JWT 密钥**: 生产环境必须通过 `JWT_SECRET` 环境变量设置强密钥
2. **密码加密**: 使用 bcryptjs，salt rounds = 10
3. **bcryptjs 配置**: 在 `next.config.js` 中标记为外部包，避免 Edge Runtime 问题
4. **CORS**: 当前未配置，生产环境需根据部署情况设置
5. **输入验证**: 所有 API 端点应对输入数据进行验证

## 部署建议

1. **环境变量**:
   ```bash
   JWT_SECRET=your-strong-secret-key
   ```

2. **构建输出**:
   - 使用 `npm run build` 生成静态文件
   - 使用 `npm start` 启动生产服务器
   - 或使用 `next export` 导出静态站点（需调整 API 路由）

3. **数据库迁移**:
   - 当前内存数据库仅适合演示
   - 生产环境建议迁移到 PostgreSQL 或 MongoDB
   - 需要重写 `src/lib/db.ts` 中的方法

4. **实时通信**:
   - 当前游戏状态通过轮询获取
   - 生产环境建议使用 WebSocket 或 Server-Sent Events 实现实时更新

## 扩展开发指南

### 添加新 API 路由

1. 在 `src/app/api/` 下创建对应目录结构
2. 创建 `route.ts` 文件
3. 导出对应 HTTP 方法的处理函数（GET、POST、PUT、DELETE）
4. 使用 `verifyToken()` 验证认证状态

### 添加新 UI 组件

1. 使用 shadcn/ui CLI 添加：`npx shadcn-ui@latest add {component}`
2. 或手动创建组件文件，遵循现有组件的结构
3. 使用 `cn()` 函数合并 Tailwind 类名

### 修改游戏规则

游戏规则逻辑集中在 `src/lib/utils.ts`：
- `duel()`: 两个数字的对决逻辑
- `resolvePublicArea()`: 公共区域结算逻辑
- `canMoveForward()`: 移动合法性检查
