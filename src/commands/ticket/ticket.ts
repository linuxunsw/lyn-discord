import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  channelMention,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  inlineCode,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { isWhitelisted } from "../../util/permissions";
import { unauthorisedMessage } from "../../config";
import { getLogger } from "../../log";
import { env } from "../../env";
import { db } from "../../db/db";
import { tickets } from "../../db/schema";
import { eq } from "drizzle-orm";

const log = getLogger("ticket");

export default {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Sets up the ticket menu in a given channel.")
    .addSubcommand((opt) =>
      opt
        .setName("close")
        .setDescription("Use in a ticket channel to close a ticket."),
    )
    .addSubcommand((opt) =>
      opt
        .setName("menu")
        .setDescription("Sets up the ticket menu in a given channel.")
        .addChannelOption((channelOpt) =>
          channelOpt
            .setName("channel")
            .setDescription("Channel to send ticket menu in.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (!interaction.inCachedGuild()) {
        await interaction.reply({
          content: `This feature is only available inside of the ${env.SOCIETY_NAME} server.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      switch (subcommand) {
        case "close": {
          await closeTicket(interaction);
          return;
        }
        case "menu": {
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
          return;
        }
      }
    } catch (e) {
      log.error({ e }, `Error running ticket command ${subcommand}`);
      await interaction.reply({
        content: `There was an error running this command`,
      });
    }
  },
};

/**
 * Closes a ticket. Generates a transcript of the conversation, including attachments, and uploads them to Google Drive.
 * Also deletes the ticket channel after completion. This can be used by the user who created the ticket, and execs.
 */
async function closeTicket(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ticket = await getTicketEntry(interaction);
  const member = interaction.member as GuildMember;
  const hasTicketRole = member.roles.cache.has(env.TICKET_RESPONSE_ROLE);

  if (ticket.length === 0) {
    await interaction.editReply("You are not in a ticket channel.");
    return;
  } else if (ticket[0].userId !== interaction.user.id || !hasTicketRole) {
    await interaction.editReply("You cannot close this ticket.");
    return;
  }

  await interaction.editReply("hi");
}

async function getTicketEntry(interaction: ChatInputCommandInteraction) {
  const ticket = await db
    .select()
    .from(tickets)
    .where(eq(tickets.channelId, interaction.channelId));

  return ticket;
}

/**
 * Sends the ticket creation menu to the given channel.
 */
async function sendTicketMenu(
  channel: TextChannel,
  interaction: ChatInputCommandInteraction,
) {
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
}

function buildTicketMenu() {
  const embed = new EmbedBuilder()
    .setTitle("tickets")
    .setDescription("press open ticket to open a new ticket.")
    .setColor(env.ACCENT_COLOUR);

  const actionRow = buildTicketActionRow();

  return { embeds: [embed], components: [actionRow] };
}

function buildTicketActionRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("newTicket_init")
      .setLabel("Open Ticket")
      .setStyle(ButtonStyle.Secondary),
  );
}
