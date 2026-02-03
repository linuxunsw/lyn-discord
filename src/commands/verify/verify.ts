import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  channelMention,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  inlineCode,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import {
  unauthorisedMessage,
  verifyMenuContent,
  verifyMenuTitle,
} from "../../config";
import { isWhitelisted } from "../../util/permissions";
import { env } from "../../env";

export default {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Sets up the verification menu in a given channel.")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to send verify menu in.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
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

    const channel = interaction.options.getChannel("channel");
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Please enter a valid text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await sendVerifyMenu(channel as TextChannel, interaction);
  },
};

async function sendVerifyMenu(
  channel: TextChannel,
  interaction: ChatInputCommandInteraction,
) {
  const messageContent = buildVerifyMenuEmbed();
  try {
    await channel.send(messageContent);
    await interaction.reply({
      content: `Set up verification menu in channel ${channelMention(channel.id)}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (e) {
    await interaction.reply({
      content: `Could not send menu to channel: ${inlineCode(e as string)}`,
      flags: MessageFlags.Ephemeral,
    });
  }
  return;
}

function buildVerifyMenuEmbed() {
  const embed = new EmbedBuilder()
    .setTitle(verifyMenuTitle)
    .setDescription(verifyMenuContent)
    .setColor(env.ACCENT_COLOUR);

  const actionRow = buildVerifyActionRow();
  return { embeds: [embed], components: [actionRow] };
}

function buildVerifyActionRow(): ActionRowBuilder<ButtonBuilder> {
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_getCode")
      .setLabel("Get Code")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("verify_enterCode")
      .setLabel("Enter Code")
      .setStyle(ButtonStyle.Secondary),
  );
  return actionRow;
}
