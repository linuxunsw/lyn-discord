# 🤖 lyn-discord
Discord verification bot based on email verification

## 🛠 Setup
- copy `.env.example`
### Set up database
```sh
bun i
bun db-setup
# optionally, if running a previous version of the bot, migrate mongodb:
bun mongo-migrate
```
### Deploy slash commands
```sh
bun deploy-command
```
