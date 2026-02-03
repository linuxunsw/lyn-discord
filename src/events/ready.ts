import { Client, Events } from "discord.js";
import { getLogger } from "../log";

const log = getLogger("startup");

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    log.info({ tag: client.user?.tag }, "Bot is ready");
  },
};
