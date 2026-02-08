FROM oven/bun:latest

WORKDIR /lyn

RUN apt-get update && \
    apt-get install -y python3 build-essential

COPY package.json bun.lock ./
RUN bun install
COPY . .

CMD ["bun", "run", "start"]
