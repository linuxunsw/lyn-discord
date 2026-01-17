import { BotClient } from "./types/client";
import { GatewayIntentBits } from "discord.js";
import { checkAnnounce } from "./commands/announce/schedule";
import { Glob } from "bun";

const ONE_MIN = 60000;

export const client = new BotClient({ intents: [GatewayIntentBits.Guilds] });
const dirname = import.meta.dir;

(async () => {
  try {
    await loadSlashCommands();
    await loadEvents();
    await client.login(process.env.DISCORD_TOKEN);
    /* check if any announcements can be sent immediately */
    await checkAnnounce(client);
  } catch (e) {
    console.error(`Could not load events & slash commands. ${e}`);
  }

  /* check whether to send announcements every min */
  setInterval(async () => {
    try {
      await checkAnnounce(client);
    } catch (e) {
      console.error(
        `Failed to check for and send scheduled announcements. ${e}`,
      );
    }
  }, ONE_MIN);
})();

async function loadSlashCommands() {
  const glob = new Glob("commands/**/*.{ts,js}");

  for await (const file of glob.scan(dirname)) {
    const filePath = `${dirname}/${file}`;
    const commandModule = await import(filePath);
    const command = commandModule.default;

    if (command && "data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    }
  }
}

async function loadEvents() {
  const glob = new Glob("events/*.{ts,js}");

  for await (const file of glob.scan(dirname)) {
    const filePath = `${dirname}/${file}`;
    const eventModule = await import(filePath);
    const event = eventModule.default;

    if (!event || !("name" in event && "execute" in event)) continue;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}
