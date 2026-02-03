import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";
import { newAnnounce } from "./new";
import { listAnnounce } from "./list";
import { previewAnnounce } from "./preview";
import { validate } from "uuid";
import { editScheduledAnnounce, editSentAnnounce } from "./edit";
import { cancelScheduledAnnounce } from "./cancel";
import { isWhitelisted } from "../../util/permissions";
import { unauthorisedMessage } from "../../config";
import { env } from "../../env";

export default {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Sends a new announcement to the given channel.")

    /* create new announcement */
    // TODO: add mention option
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
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription(
              "Channel where the message was sent (only required if editing a sent message).",
            ),
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
    )

    /* cancel upcoming announcement */
    .addSubcommand((sub) =>
      sub
        .setName("cancel")
        .setDescription("Cancel an upcoming announcement.")
        .addStringOption((opt) =>
          opt
            .setName("id")
            .setDescription("Id of the message to cancel.")
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: `This feature is only available inside of the ${env.SOCIETY_NAME} server.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!isWhitelisted(interaction.member)) {
      await interaction.reply({
        content: unauthorisedMessage,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (!subcommand) {
      await interaction.reply({
        content: "Invalid subcommand.",
        flags: MessageFlags.Ephemeral,
      });
    }

    switch (subcommand) {
      case "new": {
        await newAnnounce(interaction);
        return;
      }
      case "list": {
        await listAnnounce(interaction);
        return;
      }
      case "preview": {
        await previewAnnounce(interaction);
        return;
      }
      case "edit": {
        const id = interaction.options.getString("id");
        const channel = interaction.options.getChannel("channel");
        if (!id) {
          await interaction.reply({
            content: "Please enter an id.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        /* uuid -> scheduled */
        if (validate(id)) {
          await editScheduledAnnounce(interaction, id);
        } else if (channel) {
          await editSentAnnounce(interaction, channel.id, id);
        } else {
          await interaction.reply({
            content: "Please provide a valid id (and channel).",
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }
      case "cancel": {
        await cancelScheduledAnnounce(interaction);
        return;
      }
    }
  },
} satisfies Command;
