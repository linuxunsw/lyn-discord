# 🤖 lyn-discord
Discord verification bot based on email verification

## 🛠 Setup
- copy `.env.example`
### Set up database
```sh
npm i
npm run db-setup
# optionally, if running a previous version of the bot, migrate mongodb:
npm run mongo-migrate
```
### Deploy slash commands
```sh
npm run deploy-command
```
