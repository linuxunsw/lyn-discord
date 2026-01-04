import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";
import { newAnnounce } from "./new";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Sends a new announcement to the given channel.")

    /* create new announcement */
    .addSubcommand((sub) =>
      sub
        .setName("new")
        .setDescription("Create a new announcement.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to send announcement to.")
            .setRequired(true),
        ),
    )

    /* edit announcement */
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit a sent or upcoming announcement")
        .addStringOption((opt) =>
          opt
            .setName("id")
            .setDescription("Id of the message to edit.")
            .setRequired(true),
        ),
    )

    /* list upcoming announcements */
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List currently scheduled announcements."),
    )

    /* preview upcoming announcement */
    .addSubcommand((sub) =>
      sub
        .setName("preview")
        .setDescription("Preview an upcoming announcement.")
        .addStringOption((opt) =>
          opt
            .setName("id")
            .setDescription("Id of the message to edit.")
            .setRequired(true),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // TODO: permissions check
    const subcommand = interaction.options.getSubcommand();
    if (!subcommand) {
      await interaction.reply({
        content: "Invalid subcommand.",
        flags: MessageFlags.Ephemeral,
      });
    }

    switch (subcommand) {
      case "new":
        await newAnnounce(interaction);
        return;
    }
  },
} satisfies Command;
