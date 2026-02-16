# 魔丸小游戏 - 高级版

基于 Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui 的全栈魔丸游戏系统。

## 特性

- 🎮 完整的魔丸游戏规则实现
- 👥 2-5人在线对战
- 🔐 JWT 身份认证
- 🏠 房间管理系统
- 📊 排行榜功能
- 📱 响应式设计，完美支持移动端和桌面端
- 💻 离线模式（新手教学）
- 🎨 现代化UI设计，暗色主题

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **组件**: shadcn/ui
- **认证**: JWT
- **数据库**: 内存数据库（可替换为真实数据库）

## 快速开始

### 开发模式

```bash
npm install
npm run dev
```

访问 http://localhost:3000

### 生产部署（推荐）

使用提供的管理脚本一键部署：

```bash
# 1. 克隆项目
git clone <repository-url> /root/mowan-game-pro
cd /root/mowan-game-pro

# 2. 安装服务（自动安装依赖、构建、创建 systemd 服务和全局命令）
./manage.sh install

# 3. 安装完成后，可以在任意位置使用 mowan 命令
mowan status
mowan logs
```

### 管理服务

安装后可以使用 `mowan` 命令管理系统：

```bash
# 查看状态
mowan status

# 查看日志
mowan logs

# 重启服务
mowan restart

# 健康检查
mowan health

# 重新构建并应用更新
mowan build && mowan reload

# 卸载服务
mowan uninstall
```

## 默认账号

- 管理员: `admin` / `admin123`

## 项目结构

```
src/
  app/           # 页面和API路由
  components/    # UI组件
  lib/           # 工具函数和数据库
  types/         # TypeScript类型定义

config.ini     # 配置文件（端口、管理员账户等）
manage.sh      # 服务管理脚本
start.sh       # 服务启动脚本
```

## 配置文件

`config.ini` 用于配置服务参数：

```ini
[server]
port=3000

[admin]
username=admin
password=admin123

[log]
level=info
```

修改配置后需要重启服务生效：`mowan restart`

## 游戏规则

### 部署阶段
每位玩家将数字0-9填入3x6棋盘的10个格子中。

### 行动阶段
- **前进**: 将棋子向前移动一格
- **单挑**: 强制将其他玩家棋子移入公共区域（额外行动）
- **回收**: 回收公共区域己方棋子（额外行动）

### 对决规则
**特殊规则**:
- 相同数字 → 同归于尽
- 0 vs 6/9 → 同归于尽
- 8 > 0

**一般规则**: 反向排序，小数字获胜！
0 > 1 > 2 > 3 > 4 > 5 > 6 > 7 > 8 > 9

### 胜利条件
场上仅剩一位玩家拥有未被击败的数字时获胜。