import { REST, Routes } from "discord.js";
import { Glob } from "bun";

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
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
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

    console.log(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID as string,
        process.env.GUILD_ID as string,
      ),
      { body: commands },
    );

    console.log(`Successfully reloaded application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
