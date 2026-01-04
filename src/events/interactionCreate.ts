import {
  BaseInteraction,
  ChatInputCommandInteraction,
  Events,
  MessageFlags,
} from "discord.js";
import { BotClient } from "../types/client";

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction: BaseInteraction) {
    const client = interaction.client as BotClient;
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }
    } catch (error) {
      console.error(error);
      const chatInteraction = interaction as ChatInputCommandInteraction;

      if (chatInteraction.replied || chatInteraction.deferred) {
        await chatInteraction.followUp({
          content: "There was an error while executing this command.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await chatInteraction.reply({
          content: "There was an error while executing this command.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
