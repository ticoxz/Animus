# Animus — producción en VPS (standalone Next.js)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S animus -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=animus:nodejs /app/.next/standalone ./
COPY --from=builder --chown=animus:nodejs /app/.next/static ./.next/static

USER animus
EXPOSE 3000

CMD ["node", "server.js"]
