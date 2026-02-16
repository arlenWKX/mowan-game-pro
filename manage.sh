#!/bin/bash

# 魔丸小游戏服务管理脚本
# 用法: ./manage.sh [start|stop|restart|status|logs|reload|build|clean]

set -e

SERVICE_NAME="mowan-game"
PROJECT_DIR="/root/mowan-game-pro"
NEXT_DIR="${PROJECT_DIR}/.next"
CONFIG_FILE="${PROJECT_DIR}/config.ini"

# Colors
color_green() { echo -e "\033[32m$1\033[0m"; }
color_red() { echo -e "\033[31m$1\033[0m"; }
color_yellow() { echo -e "\033[33m$1\033[0m"; }
color_blue() { echo -e "\033[34m$1\033[0m"; }
color_cyan() { echo -e "\033[36m$1\033[0m"; }

# Show help
show_help() {
    cat << EOF
魔丸小游戏服务管理脚本

用法: $0 [命令]

命令:
  install  安装服务（创建 systemd 服务和全局命令）
  uninstall 卸载服务（移除 systemd 服务和全局命令）
  start    启动服务
  stop     停止服务 (加 -f 或 --force 强制停止进程并检查端口释放)
  restart  重启服务（先停止再启动）
  reload   重新加载（构建后重启，确保应用最新代码）
  build    重新构建项目 (加 -f 或 --force 先清理缓存)
  clean    清理构建缓存
  status   查看服务状态
  health   健康检查（检验服务器功能是否正常）
  logs     查看实时日志
  help     显示帮助信息

示例:
  $0 install                    # 安装服务（首次部署）
  $0 uninstall                  # 卸载服务
  $0 build && $0 reload         # 构建并应用更新
  $0 build -f                   # 清理缓存后重新构建
  $0 clean                      # 仅清理缓存
  $0 stop -f                    # 强制停止服务并检查端口释放
  $0 logs                       # 查看实时日志

EOF
}

# Check if service file exists
check_service_file() {
    if [[ ! -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
        color_red "错误: systemd 服务文件不存在"
        color_yellow "请运行: $0 install"
        return 1
    fi
    return 0
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        color_red "错误: 此命令需要 root 权限"
        color_yellow "请使用: sudo $0 $1"
        return 1
    fi
    return 0
}

# Install service and global command
cmd_install() {
    check_root "install" || return 1
    
    color_blue "=============================="
    color_blue "      安装魔丸小游戏服务"
    color_blue "=============================="
    
    # Check if already installed
    if [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]] && [[ -f "/usr/local/bin/mowan" ]]; then
        color_yellow "服务已安装"
        color_cyan "使用 'mowan status' 查看状态"
        return 0
    fi
    
    # 1. Check project directory
    if [[ ! -f "${PROJECT_DIR}/package.json" ]]; then
        color_red "错误: 未找到项目文件"
        color_yellow "请确保在正确的项目目录中运行此命令"
        return 1
    fi
    
    # 2. Install dependencies
    if [[ ! -d "${PROJECT_DIR}/node_modules" ]]; then
        color_blue "正在安装依赖..."
        cd "${PROJECT_DIR}"
        if ! npm install; then
            color_red "❌ 依赖安装失败"
            return 1
        fi
        color_green "✅ 依赖安装完成"
    fi
    
    # 3. Build project
    if [[ ! -d "${PROJECT_DIR}/.next" ]]; then
        color_blue "正在构建项目..."
        cmd_build
        if [[ $? -ne 0 ]]; then
            color_red "❌ 项目构建失败"
            return 1
        fi
    fi
    
    # 4. Create systemd service file
    color_blue "正在创建 systemd 服务..."
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=Mowan Game Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${PROJECT_DIR}
ExecStart=${PROJECT_DIR}/start.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}.service"
    color_green "✅ systemd 服务已创建"
    
    # 5. Create global command
    color_blue "正在创建全局命令..."
    cat > "/usr/local/bin/mowan" << 'EOF'
#!/bin/bash
# mowan - 魔丸小游戏管理命令
# 这是一个代理脚本，调用实际的 manage.sh

MOWAN_DIR="/root/mowan-game-pro"

if [[ ! -f "${MOWAN_DIR}/manage.sh" ]]; then
    echo "错误: 未找到 manage.sh 脚本"
    echo "请检查项目目录: ${MOWAN_DIR}"
    exit 1
fi

exec "${MOWAN_DIR}/manage.sh" "$@"
EOF
    chmod +x "/usr/local/bin/mowan"
    color_green "✅ 全局命令 'mowan' 已创建"
    
    # 6. Start service
    color_blue "正在启动服务..."
    if systemctl start "${SERVICE_NAME}.service"; then
        sleep 2
        if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
            color_green "✅ 服务启动成功！"
        else
            color_yellow "⚠️ 服务可能启动较慢，请稍后检查状态"
        fi
    else
        color_red "❌ 服务启动失败"
        color_yellow "请检查日志: journalctl -u ${SERVICE_NAME}.service --no-pager -n 20"
    fi
    
    echo ""
    color_green "=============================="
    color_green "      安装完成！"
    color_green "=============================="
    echo ""
    color_cyan "使用命令:"
    echo "  mowan status    - 查看服务状态"
    echo "  mowan start     - 启动服务"
    echo "  mowan stop      - 停止服务"
    echo "  mowan restart   - 重启服务"
    echo "  mowan health    - 健康检查"
    echo "  mowan logs      - 查看日志"
    echo "  mowan --help    - 显示完整帮助"
    echo ""
    color_cyan "项目目录: ${PROJECT_DIR}"
    color_cyan "配置文件: ${PROJECT_DIR}/config.ini"
}

# Uninstall service and global command
cmd_uninstall() {
    check_root "uninstall" || return 1
    
    color_blue "=============================="
    color_blue "      卸载魔丸小游戏服务"
    color_blue "=============================="
    
    # Confirm uninstall
    color_yellow "警告: 此操作将停止服务并删除所有安装文件"
    read -p "是否继续? [y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        color_cyan "已取消卸载"
        return 0
    fi
    
    # 1. Stop and disable service
    if [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
        color_blue "正在停止服务..."
        systemctl stop "${SERVICE_NAME}.service" 2>/dev/null || true
        systemctl disable "${SERVICE_NAME}.service" 2>/dev/null || true
        rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
        systemctl daemon-reload
        color_green "✅ 服务已停止并移除"
    fi
    
    # 2. Remove global command
    if [[ -f "/usr/local/bin/mowan" ]]; then
        color_blue "正在移除全局命令..."
        rm -f "/usr/local/bin/mowan"
        color_green "✅ 全局命令 'mowan' 已移除"
    fi
    
    # 3. Optional: ask to remove build files
    echo ""
    read -p "是否同时删除构建文件 (.next)? [y/N]: " clean_build
    if [[ "$clean_build" =~ ^[Yy]$ ]]; then
        if [[ -d "${PROJECT_DIR}/.next" ]]; then
            rm -rf "${PROJECT_DIR}/.next"
            color_green "✅ 构建文件已删除"
        fi
    fi
    
    echo ""
    color_green "=============================="
    color_green "      卸载完成！"
    color_green "=============================="
    echo ""
    color_cyan "项目文件保留在: ${PROJECT_DIR}"
    color_cyan "如需完全删除，请手动执行: rm -rf ${PROJECT_DIR}"
}

# Check build exists
check_build() {
    if [[ ! -d "${NEXT_DIR}" ]] || [[ ! -f "${NEXT_DIR}/BUILD_ID" ]]; then
        color_red "错误: 未找到构建文件"
        color_yellow "请先运行: $0 build"
        return 1
    fi
    return 0
}

# Read config value from config file
read_config() {
    local section=$1
    local key=$2
    local default_value=$3
    
    if [[ -f "$CONFIG_FILE" ]]; then
        local value=$(grep -E "^${key}=" "$CONFIG_FILE" | grep -A1 "^\[${section}\]" | tail -1 | cut -d'=' -f2)
        if [[ -z "$value" ]]; then
            # Try direct search (for values in same section or global)
            value=$(awk -F= "/^\\[${section}\\]/{found=1} found && /^${key}=/{print \$2; exit}" "$CONFIG_FILE")
        fi
        echo "${value:-$default_value}"
    else
        echo "$default_value"
    fi
}

# Get service port from config file
get_service_port() {
    read_config "server" "port" "3000"
}

# Wait for service to be active or inactive
wait_for_status() {
    local target_status=$1
    local timeout=${2:-10}
    local count=0
    
    while [[ $count -lt $timeout ]]; do
        if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
            [[ "$target_status" == "active" ]] && return 0
        else
            [[ "$target_status" == "inactive" ]] && return 0
        fi
        sleep 1
        ((count++))
    done
    return 1
}

# Start service
cmd_start() {
    check_service_file || return 1
    
    if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
        color_yellow "服务已在运行"
        show_port_info
        return 0
    fi
    
    check_build || return 1
    
    color_blue "正在启动 ${SERVICE_NAME} 服务..."
    if systemctl start "${SERVICE_NAME}.service"; then
        if wait_for_status active 10; then
            color_green "✅ 服务启动成功！"
            show_port_info
        else
            color_red "❌ 服务启动超时"
            color_yellow "请检查日志: $0 logs"
            return 1
        fi
    else
        color_red "❌ 启动命令执行失败"
        color_yellow "请检查日志: journalctl -u ${SERVICE_NAME}.service --no-pager -n 20"
        return 1
    fi
}

# Stop service
# Usage: cmd_stop [force]
#   force: if "true", kill processes and check port release
cmd_stop() {
    local force=${1:-false}
    local port=$(get_service_port)
    
    check_service_file || return 1
    
    if ! systemctl is-active --quiet "${SERVICE_NAME}.service"; then
        if [[ "$force" == "true" ]]; then
            color_yellow "服务未运行，执行强制清理..."
            cmd_force_cleanup "$port"
            return $?
        fi
        color_yellow "服务未运行"
        return 0
    fi
    
    color_blue "正在停止 ${SERVICE_NAME} 服务..."
    if systemctl stop "${SERVICE_NAME}.service"; then
        if wait_for_status inactive 10; then
            color_green "✅ 服务已停止"
        else
            color_red "❌ 服务停止超时"
            if [[ "$force" == "true" ]]; then
                color_yellow "执行强制终止..."
                systemctl kill "${SERVICE_NAME}.service" 2>/dev/null || true
                sleep 2
            else
                color_yellow "使用 -f 或 --force 参数强制停止"
                return 1
            fi
        fi
    else
        color_red "❌ 停止服务失败"
        return 1
    fi
    
    # Force cleanup if requested
    if [[ "$force" == "true" ]]; then
        cmd_force_cleanup "$port"
        return $?
    fi
}

# Force cleanup - kill processes and check port release
cmd_force_cleanup() {
    local port=${1:-3000}
    local has_error=false
    
    color_blue "=============================="
    color_blue "      强制清理"
    color_blue "=============================="
    
    # Kill any remaining next-server processes
    local pids=$(pgrep -f "next-server" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        color_yellow "发现残留进程，正在终止..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
        color_green "✅ 已终止残留进程"
    fi
    
    # Check if port is still in use
    local port_pids=$(ss -tlnp 2>/dev/null | grep ":${port}" | grep -oP 'pid=\K[0-9]+' || true)
    if [[ -n "$port_pids" ]]; then
        color_yellow "端口 ${port} 仍被占用，强制终止相关进程..."
        echo "$port_pids" | sort -u | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    # Verify port release
    if ss -tlnp 2>/dev/null | grep -q ":${port}"; then
        color_red "❌ 端口 ${port} 仍被占用"
        local remaining_pids=$(ss -tlnp 2>/dev/null | grep ":${port}" | grep -oP 'pid=\K[0-9]+' | sort -u | tr '\n' ' ')
        [[ -n "$remaining_pids" ]] && color_yellow "占用进程 PID: $remaining_pids"
        has_error=true
    else
        color_green "✅ 端口 ${port} 已释放"
    fi
    
    if [[ "$has_error" == "true" ]]; then
        return 1
    fi
    color_green "✅ 强制清理完成"
    return 0
}

# Restart service
cmd_restart() {
    local force_stop=${1:-false}
    
    check_service_file || return 1
    check_build || return 1
    
    color_blue "正在重启 ${SERVICE_NAME} 服务..."
    
    # Stop first
    cmd_stop "$force_stop"
    local stop_result=$?
    
    if [[ $stop_result -ne 0 ]]; then
        color_red "❌ 停止服务失败，无法继续重启"
        return 1
    fi
    
    # Clear systemd status to avoid rate limiting
    systemctl reset-failed "${SERVICE_NAME}.service" 2>/dev/null || true
    
    # Start
    if systemctl start "${SERVICE_NAME}.service"; then
        if wait_for_status active 10; then
            color_green "✅ 服务重启成功！"
            show_port_info
        else
            color_red "❌ 服务重启超时"
            color_yellow "请检查日志: $0 logs"
            return 1
        fi
    else
        color_red "❌ 重启命令执行失败"
        color_yellow "请检查日志: $0 logs"
        return 1
    fi
}

# Reload (build + restart)
cmd_reload() {
    color_blue "重新加载服务..."
    
    # Check build
    if [[ ! -d "${NEXT_DIR}" ]] || [[ ! -f "${NEXT_DIR}/BUILD_ID" ]]; then
        color_yellow "未找到构建文件，先执行构建..."
        cmd_build || return 1
    fi
    
    # Reload systemd daemon (in case service file changed)
    systemctl daemon-reload
    
    # Restart service
    cmd_restart
}

# Build project
# Usage: cmd_build [force]
#   force: if "true", clean cache before build
cmd_build() {
    local force=${1:-false}
    
    if [[ "$force" == "true" ]]; then
        color_blue "强制模式：先清理缓存再构建..."
        cmd_clean
        echo ""
    fi
    
    color_blue "正在构建项目..."
    cd "${PROJECT_DIR}"
    
    # Check node_modules
    if [[ ! -d "node_modules" ]]; then
        color_yellow "安装依赖..."
        npm install || {
            color_red "❌ 依赖安装失败"
            return 1
        }
    fi
    
    # Clean previous build (if not already cleaned in force mode)
    if [[ "$force" != "true" ]] && [[ -d "${NEXT_DIR}" ]]; then
        color_cyan "清理旧构建..."
        rm -rf "${NEXT_DIR}"
    fi
    
    # Build
    if npm run build; then
        color_green "✅ 构建成功！"
        
        # Verify build output
        if [[ ! -f "${NEXT_DIR}/BUILD_ID" ]]; then
            color_red "❌ 构建输出不完整"
            return 1
        fi
        
        local build_size=$(du -sh "${NEXT_DIR}" 2>/dev/null | cut -f1)
        color_cyan "构建大小: ${build_size}"
        
        if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
            color_yellow "提示: 运行 '$0 reload' 来应用更新"
        fi
    else
        color_red "❌ 构建失败"
        return 1
    fi
}

# Clean build cache only (no rebuild)
cmd_clean() {
    color_blue "正在清理构建缓存..."
    cd "${PROJECT_DIR}"
    
    local cleaned=false
    
    # Clean .next directory
    if [[ -d "${NEXT_DIR}" ]]; then
        rm -rf "${NEXT_DIR}"
        color_green "✅ 已清理 .next 目录"
        cleaned=true
    fi
    
    # Clean npm cache
    if [[ -d "node_modules/.cache" ]]; then
        rm -rf node_modules/.cache
        color_green "✅ 已清理 npm 缓存"
        cleaned=true
    fi
    
    # Clean other cache files
    if [[ -f "tsconfig.tsbuildinfo" ]]; then
        rm -f tsconfig.tsbuildinfo
        color_green "✅ 已清理 TypeScript 构建缓存"
        cleaned=true
    fi
    
    if [[ "$cleaned" == "false" ]]; then
        color_yellow "没有需要清理的缓存文件"
    else
        color_green "✅ 缓存清理完成"
    fi
}

# Show status
cmd_status() {
    check_service_file || return 1
    
    color_blue "=============================="
    color_blue "      服务运行状态"
    color_blue "=============================="
    systemctl status "${SERVICE_NAME}.service" --no-pager || true
    
    echo ""
    if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
        show_port_info
        
        # Show build info
        if [[ -f "${NEXT_DIR}/BUILD_ID" ]]; then
            local build_id=$(cat "${NEXT_DIR}/BUILD_ID")
            local build_time=$(stat -c %y "${NEXT_DIR}/BUILD_ID" 2>/dev/null | cut -d'.' -f1)
            color_cyan "构建ID: ${build_id}"
            color_cyan "构建时间: ${build_time}"
        fi
    else
        color_yellow "服务未运行"
    fi
}

# Health check - 检验服务器功能是否正常
cmd_health() {
    check_service_file || return 1
    
    color_blue "=============================="
    color_blue "      健康检查"
    color_blue "=============================="
    
    local port=$(get_service_port)
    local has_error=false
    
    # Check service status
    if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
        color_green "✅ 服务进程运行中"
    else
        color_red "❌ 服务进程未运行"
        has_error=true
    fi
    
    # Check port listening
    if ss -tlnp 2>/dev/null | grep -q ":${port}"; then
        color_green "✅ 端口 ${port} 监听正常"
    else
        color_red "❌ 端口 ${port} 未监听"
        has_error=true
    fi
    
    # Check HTTP response
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/" 2>/dev/null)
    if [[ "$http_status" == "200" ]]; then
        color_green "✅ HTTP 首页响应正常 (HTTP 200)"
    else
        color_red "❌ HTTP 首页响应异常 (状态码: ${http_status:-无法连接})"
        has_error=true
    fi
    
    # Check build
    if [[ -f "${NEXT_DIR}/BUILD_ID" ]]; then
        color_green "✅ 构建文件存在"
    else
        color_red "❌ 构建文件缺失"
        has_error=true
    fi
    
    # Check disk space
    local disk_usage=$(df -h "${PROJECT_DIR}" | tail -1 | awk '{print $5}' | tr -d '%')
    if [[ $disk_usage -lt 80 ]]; then
        color_green "✅ 磁盘空间充足 (${disk_usage}%)"
    else
        color_yellow "⚠️ 磁盘空间不足 (${disk_usage}%)"
    fi
    
    # Check memory
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [[ $mem_usage -lt 80 ]]; then
        color_green "✅ 内存使用正常 (${mem_usage}%)"
    else
        color_yellow "⚠️ 内存使用率较高 (${mem_usage}%)"
    fi
    
    echo ""
    if [[ "$has_error" == "true" ]]; then
        color_red "❌ 健康检查未通过"
        return 1
    else
        color_green "✅ 健康检查通过"
        return 0
    fi
}

# Show logs
cmd_logs() {
    check_service_file || return 1
    color_blue "正在显示实时日志 (按 Ctrl+C 退出)..."
    journalctl -u "${SERVICE_NAME}.service" -f --no-hostname
}

# Show port info
show_port_info() {
    local port=$(get_service_port)
    
    # Verify port is actually listening
    if ss -tlnp 2>/dev/null | grep -q ":${port}"; then
        color_green "🌐 服务正在运行，端口: ${port}"
        echo "   本地访问: http://localhost:${port}"
        
        local public_ip=$(curl -s --max-time 2 ifconfig.me 2>/dev/null || echo '')
        if [[ -n "$public_ip" ]]; then
            echo "   公网访问: http://${public_ip}:${port}"
        fi
    else
        color_yellow "⚠️ 服务配置端口: ${port}，但未检测到端口监听"
    fi
}

# Main program
if [[ $# -eq 0 ]]; then
    show_help
    exit 0
fi

case "$1" in
    install)
        cmd_install
        ;;
    uninstall)
        cmd_uninstall
        ;;
    start)
        cmd_start
        ;;
    stop)
        # Check for -f or --force flag
        if [[ "$2" == "-f" ]] || [[ "$2" == "--force" ]]; then
            cmd_stop true
        else
            cmd_stop false
        fi
        ;;
    restart)
        # Check for -f or --force flag
        if [[ "$2" == "-f" ]] || [[ "$2" == "--force" ]]; then
            cmd_restart true
        else
            cmd_restart false
        fi
        ;;
    reload)
        cmd_reload
        ;;
    build)
        # Check for -f or --force flag
        if [[ "$2" == "-f" ]] || [[ "$2" == "--force" ]]; then
            cmd_build true
        else
            cmd_build false
        fi
        ;;
    clean)
        cmd_clean
        ;;
    -f|--force)
        color_red "错误: -f 或 --force 参数需要配合 build 命令使用"
        color_yellow "用法: $0 build -f  或  $0 build --force"
        exit 1
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs
        ;;
    health)
        cmd_health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        color_red "未知命令: $1"
        show_help
        exit 1
        ;;
esac
