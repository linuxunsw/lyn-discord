FROM oven/bun:alpine

WORKDIR /lyn

RUN apk add --no-cache python3 build-base

COPY package.json bun.lock ./
RUN bun install --production
COPY . .

CMD ["bun", "run", "start"]
