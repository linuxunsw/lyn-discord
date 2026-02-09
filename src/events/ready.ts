import { ActivityType, Client, Events } from "discord.js";
import { getLogger } from "../log";
import os from "os";

const log = getLogger("startup");

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    log.info({ tag: client.user?.tag }, "Bot is ready");

    client.user?.setActivity({
      name: "status",
      state: `Running ${os.type()}-${os.release()}`,
      type: ActivityType.Custom,
    });
  },
};
