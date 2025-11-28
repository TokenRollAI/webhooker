# Webhooker - 多阶段构建
# 支持 Cloudflare Workers 和 Docker 自部署

# ============================================================================
# 阶段 1: 构建
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建 TypeScript
RUN npm run build

# ============================================================================
# 阶段 2: 生产环境
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 webhooker

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 只复制生产所需文件
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# 只安装生产依赖
RUN npm ci --omit=dev && npm cache clean --force

# 切换到非 root 用户
USER webhooker

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# 启动命令
CMD ["node", "dist/node.js"]
