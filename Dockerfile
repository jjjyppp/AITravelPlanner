# ---------- 构建阶段 ----------
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .

# 声明所有可能注入的变量（供 build-args 传入）
ARG VITE_AMAP_KEY
ARG VITE_AMAP_SECURITY
ARG VITE_LLM_API_KEY
ARG VITE_XF_APP_ID
ARG VITE_XF_API_KEY
ARG VITE_XF_API_SECRET
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# 让 Vite 在构建时读取到这些变量
ENV VITE_AMAP_KEY=$VITE_AMAP_KEY
ENV VITE_AMAP_SECURITY=$VITE_AMAP_SECURITY
ENV VITE_LLM_API_KEY=$VITE_LLM_API_KEY
ENV VITE_XF_APP_ID=$VITE_XF_APP_ID
ENV VITE_XF_API_KEY=$VITE_XF_API_KEY
ENV VITE_XF_API_SECRET=$VITE_XF_API_SECRET
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# ---------- 运行阶段 ----------
FROM nginx:alpine

# 安装 openssl 以生成自签名证书
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -days 365 \
         -newkey rsa:2048 \
         -keyout /etc/nginx/certs/selfsigned.key \
         -out /etc/nginx/certs/selfsigned.crt \
         -subj "/CN=localhost"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# 暴露 HTTP 与 HTTPS 端口
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
