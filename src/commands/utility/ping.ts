import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/command";

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("pong"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("pong");
  },
} satisfies Command;
