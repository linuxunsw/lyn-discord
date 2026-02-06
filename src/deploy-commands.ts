import { REST, Routes } from "discord.js";
import { Glob } from "bun";
import { getLogger } from "./log";
import { env } from "./env";

const log = getLogger("deploy");
const dirname = import.meta.dir;

async function loadCommands() {
  const commands = [];
  const glob = new Glob("commands/**/*.{ts,js}");

  for await (const file of glob.scan(dirname)) {
    const filePath = `${dirname}/${file}`;
    const commandModule = await import(filePath);
    const command = commandModule.default;
    if (command && "data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      log.warn({ filePath }, "Command is missing required 'data' or 'execute' property");
    }
  }
  return commands;
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN as string);

// and deploy your commands!
(async () => {
  try {
    const commands = await loadCommands();

    log.info({ count: commands.length }, "Started refreshing application commands");

    // The put method is used to fully refresh all commands in the guild with the current set
    if (Bun.env["NODE_ENV"] === "development") {
      await rest.put(
          Routes.applicationGuildCommands(
              process.env.CLIENT_ID as string,
              process.env.GUILD_ID as string,
          ),
          { body: commands },
      );
    } else {
      await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: commands });
    }

    log.info("Successfully reloaded application commands");
  } catch (error) {
    log.error(error, "Failed to reload application commands");
  }
})();
