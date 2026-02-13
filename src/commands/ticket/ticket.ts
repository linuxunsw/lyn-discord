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
import { isWhitelisted } from "../../util/permissions";
import { unauthorisedMessage } from "../../config";
import { getLogger } from "../../log";
import { env } from "../../env";
import { channel } from "process";

const log = getLogger("ticket");

export default {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Sets up the ticket menu in a given channel.")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to send ticket menu in.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
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

      await sendTicketMenu(channel as TextChannel, interaction);
    } catch (e) {
      log.error({ e }, `Error sending ticket menu.`);
      await interaction.reply({
        content: `There was an error running this command`,
      });
    }
  },
};

async function sendTicketMenu(channel: TextChannel, interaction: ChatInputCommandInteraction) {
  const messageContent = buildTicketMenu();
  try {
    await channel.send(messageContent);
    await interaction.reply({
      content: `Set up ticket menu in channel ${channelMention(channel.id)}`,
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

function buildTicketMenu() {
  const embed = new EmbedBuilder()
    .setTitle("tickets")
    .setDescription("press open ticket to open a new ticket.")
    .setColor(env.ACCENT_COLOUR);

  const actionRow = buildTicketActionRow();

  return { embed: [embed], components: [actionRow] };
}

function buildTicketActionRow(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("newTicket_init")
        .setLabel("Open Ticket")
        .setStyle(ButtonStyle.Secondary),
    );
  }
}
