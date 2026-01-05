import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { BotClient } from "./types/client";
import { GatewayIntentBits } from "discord.js";
import { fileURLToPath } from "node:url";
import { checkAnnounce } from "./commands/announce/schedule";

const ONE_MIN = 60000;

export const client = new BotClient({ intents: [GatewayIntentBits.Guilds] });
const dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const foldersPath = path.join(dirname, "./commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const commandModule = await import(filePath);
      const command = commandModule.default;

      if (command && "data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(
          `command @ ${filePath} is missing a required 'data' or 'execute' property.`,
        );
      }
    }
  }
}

async function loadEvents() {
  const eventsPath = path.join(dirname, "./events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
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
