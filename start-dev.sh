#!/bin/bash

# 一键启动前后端开发服务器

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 启动前后端开发服务器...${NC}\n"

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 函数：启动后端
start_backend() {
    echo -e "${GREEN}📦 启动后端服务...${NC}"
    cd backend
    
    # 检查是否需要安装依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}   安装后端依赖...${NC}"
        npm install
    fi
    
    # 启动后端
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}   ✓ 后端已启动 (PID: $BACKEND_PID)${NC}"
    cd ..
}

# 函数：启动前端
start_frontend() {
    echo -e "${GREEN}🎨 启动前端服务...${NC}"
    cd frontend
    
    # 检查是否需要安装依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}   安装前端依赖...${NC}"
        npm install
    fi
    
    # 启动前端
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}   ✓ 前端已启动 (PID: $FRONTEND_PID)${NC}"
    cd ..
}

# 启动服务
start_backend
sleep 2  # 等待后端启动
start_frontend

echo -e "\n${GREEN}✅ 所有服务已启动！${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📱 前端：${NC} http://localhost:5173"
echo -e "${GREEN}🔧 后端：${NC} http://localhost:3000"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}💡 按 Ctrl+C 停止所有服务${NC}\n"

# 捕获 Ctrl+C 信号，停止所有服务
trap "echo -e '\n${YELLOW}🛑 正在停止所有服务...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e '${GREEN}✓ 所有服务已停止${NC}'; exit 0" INT

# 等待子进程
wait
