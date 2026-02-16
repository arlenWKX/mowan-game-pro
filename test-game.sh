#!/bin/bash
# ============================================
# 魔丸小游戏 - 完整游戏流程测试脚本 (简化版)
# ============================================

BASE_URL="${1:-http://localhost:3000}"
API_URL="$BASE_URL/api"

echo "========================================"
echo "魔丸小游戏 - 完整游戏流程测试"
echo "========================================"
echo "测试服务器: $BASE_URL"
echo ""

# 生成测试数据
USER1_NAME="test$(date +%s | tail -c 8)"
USER1_NICK="测试玩家1"
USER1_PASS="testpass123"

echo "[1/6] 注册用户..."
REGISTER_RESP=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER1_NAME\",\"password\":\"$USER1_PASS\",\"nickname\":\"$USER1_NICK\"}")

if echo "$REGISTER_RESP" | grep -q '"success":true'; then
    echo "✓ 注册成功"
else
    echo "⚠ 注册可能已存在，继续尝试登录"
fi

echo ""
echo "[2/6] 登录用户..."
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER1_NAME\",\"password\":\"$USER1_PASS\"}")

if echo "$LOGIN_RESP" | grep -q '"success":true'; then
    USER1_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "✓ 登录成功"
    echo "  Token: ${USER1_TOKEN:0:30}..."
else
    echo "✗ 登录失败: $LOGIN_RESP"
    exit 1
fi

echo ""
echo "[3/6] 创建房间..."
ROOM_RESP=$(curl -s -X POST "$API_URL/rooms" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"max_players":3}')

if echo "$ROOM_RESP" | grep -q '"success":true'; then
    ROOM_ID=$(echo "$ROOM_RESP" | grep -o '"room_id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "✓ 房间创建成功: $ROOM_ID"
else
    echo "✗ 创建房间失败: $ROOM_RESP"
    exit 1
fi

echo ""
echo "[4/6] 添加人机..."
for i in 1 2; do
    BOT_RESP=$(curl -s -X POST "$API_URL/rooms/$ROOM_ID/add-bot" \
        -H "Authorization: Bearer $USER1_TOKEN")
    if echo "$BOT_RESP" | grep -q '"success":true'; then
        echo "✓ 人机 $i 添加成功"
    else
        echo "✗ 人机 $i 添加失败: $BOT_RESP"
    fi
done

echo ""
echo "[5/6] 部署棋盘..."
BOARD_JSON='{"1A":0,"1B":1,"1C":2,"1D":3,"1E":4,"1F":5,"2A":6,"2B":7,"2C":8,"2D":9,"2E":null,"2F":null,"3A":null,"3B":null,"3C":null,"3D":null,"3E":null,"3F":null}'

DEPLOY_RESP=$(curl -s -X POST "$API_URL/rooms/$ROOM_ID/ready" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -d "{\"board\":$BOARD_JSON}")

if echo "$DEPLOY_RESP" | grep -q '"success":true'; then
    echo "✓ 部署成功"
else
    echo "✗ 部署失败: $DEPLOY_RESP"
    exit 1
fi

echo ""
echo "等待人机自动准备..."
sleep 3

echo "检查房间状态..."
curl -s "$API_URL/rooms/$ROOM_ID" -H "Authorization: Bearer $USER1_TOKEN" | grep -o '"isReady":true' | wc -l | xargs echo "已准备玩家数:"

echo ""
echo "[6/6] 开始游戏..."
START_RESP=$(curl -s -X POST "$API_URL/rooms/$ROOM_ID/start" \
    -H "Authorization: Bearer $USER1_TOKEN")

if echo "$START_RESP" | grep -q '"success":true'; then
    echo "✓ 游戏开始成功"
else
    echo "✗ 游戏开始失败: $START_RESP"
    exit 1
fi

echo ""
echo "========================================"
echo "测试完成！"
echo "========================================"
echo ""
echo "测试数据:"
echo "  用户名: $USER1_NAME"
echo "  昵称: $USER1_NICK"
echo "  房间ID: $ROOM_ID"
echo ""
echo "游戏链接:"
echo "  $BASE_URL/room/$ROOM_ID"
echo ""
echo "API 检查:"
echo "  curl -H \"Authorization: Bearer $USER1_TOKEN\" $API_URL/rooms/$ROOM_ID/state"
