import {
  channelMention,
  EmbedBuilder,
  LabelBuilder,
  ModalBuilder,
  roleMention,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  userMention,
} from "@discordjs/builders";
import {
  ButtonInteraction,
  ChannelType,
  MessageFlags,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  TextChannel,
  TextInputStyle,
} from "discord.js";
import { env } from "../../env";
import { getLogger } from "../../log";
import { tickets } from "../../db/schema";
import { db } from "../../db/db";
import { eq } from "drizzle-orm";
import { client } from "../..";

const log = getLogger("ticket");

/**
 * Displays a modal to a user with the form for creating a new ticket.
 */
export async function displayTicketModal(interaction: ButtonInteraction) {
  const ticketModal = buildTicketModal();
  await interaction.showModal(ticketModal);
}

/**
 * Builds the modal for the ticket creation form.
 */
function buildTicketModal() {
  const modal = new ModalBuilder()
    .setCustomId("newTicket_form")
    .setTitle("New Ticket");

  const ticketTypeSelect = new StringSelectMenuBuilder()
    .setCustomId("newTicket_type")
    .setPlaceholder("Select a ticket category...")
    .setRequired(true)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Verification Issue")
        .setDescription(
          "Issues with verification, e.g. missing email, Lyn bot verification bugs",
        )
        .setValue("verify"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Grievances")
        .setDescription("Complaints with the society")
        .setValue("grievance"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Other")
        .setDescription("Any other issues")
        .setValue("other"),
    );

  const ticketTypeSelectLabel = new LabelBuilder()
    .setLabel("Ticket Category")
    .setStringSelectMenuComponent(ticketTypeSelect);

  const ticketDescription = new TextInputBuilder()
    .setCustomId("newTicket_description")
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph);

  const ticketDescriptionLabel = new LabelBuilder()
    .setLabel("Description")
    .setTextInputComponent(ticketDescription);

  modal.addLabelComponents(ticketTypeSelectLabel, ticketDescriptionLabel);
  return modal;
}

export async function newTicket(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  /* create channel */
  const ticketChannel = await createTicketChannel(interaction);
  if (!ticketChannel) {
    await interaction.editReply({
      content: "There was an error when creating a ticket.",
    });
    return;
  }

  /* update user saying ticket created, reply to modal submit interaction */
  await interaction.editReply({
    content: `Ticket created! See ${channelMention(ticketChannel.id)}`,
  });

  /* send message to exec */
  await sendTicketNotification(interaction, ticketChannel.id);
}

/**
 * Creates a channel for the user's ticket. Returns channel when successful.
 */
async function createTicketChannel(
  userInteraction: ModalSubmitInteraction,
): Promise<TextChannel | undefined> {
  /* add user access to channel (category should already be configured for execs to see) */
  const guild = userInteraction.guild;
  if (!guild) {
    log.warn("Attempt to create ticket with invalid guild");
    await userInteraction.editReply({
      content: `This can only be used inside of ${env.SOCIETY_NAME}`,
    });
    return;
  }

  const ticketId = await createTicketEntry(userInteraction);
  const category = userInteraction.guild.channels.cache.get(
    env.TICKET_CATEGORY_ID,
  );
  if (!category || category.type != ChannelType.GuildCategory) {
    log.error("Invalid category id.");
    return;
  }

  try {
    const ticketChannel = await guild.channels.create({
      name: `ticket-${ticketId}`.substring(0, 100),
      parent: category,
      permissionOverwrites: [
        /* add parent category's permissions */
        ...category.permissionOverwrites.cache.values(),
        {
          /* add the user who created the ticket to the channel */
          id: userInteraction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    });

    /* add channelId to ticket */
    await db
      .update(tickets)
      .set({ channelId: ticketChannel.id })
      .where(eq(tickets.id, ticketId));

    return ticketChannel;
  } catch (e) {
    /* roll back ticket creation on failure */
    await db.delete(tickets).where(eq(tickets.id, ticketId));
    log.error(e, "Error creating ticket");
    return;
  }
}

/**
 * Creates an entry in the ticket table. The `channelId` needs to be updated later, as the name of the channel
 * is determined by the id generated when inserting into the table. Returns the id of the entry so that
 * the channelId can be updated.
 */
export async function createTicketEntry(
  userInteraction: ModalSubmitInteraction,
): Promise<number> {
  const [ticket] = await db
    .insert(tickets)
    .values({
      userId: userInteraction.user.id,
      guildId: userInteraction.guildId!,
      channelId: "0",
      createdAt: Math.floor(Date.now() / 1000),
    })
    .returning();

  return ticket.id;
}

async function sendTicketNotification(
  interaction: ModalSubmitInteraction,
  ticketChannelId: string,
) {
  const guild = client.guilds.cache.get(env.GUILD_ID);
  const notifyChannel = (await guild?.channels.fetch(
    env.TICKET_NOTIFY_CHANNEL_ID,
  )) as TextChannel;

  const type = interaction.fields.getStringSelectValues("newTicket_type");
  const description = interaction.fields.getTextInputValue(
    "newTicket_description",
  );

  const ticketNotification = buildTicketNotificationEmbed(
    description,
    type[0],
    ticketChannelId,
    interaction.user.id,
  );

  await notifyChannel.send({
    content: roleMention(env.TICKET_RESPONSE_ROLE),
    embeds: [ticketNotification],
  });
}

/**
 * Builds the embed for ticket notifications to executives.
 */
function buildTicketNotificationEmbed(
  description: string,
  ticketType: string,
  channelId: string,
  userId: string,
) {
  const embed = new EmbedBuilder()
    .setTitle("New ticket created")
    .setDescription(
      `**User**: ${userMention(userId)}\n
      **Information provided:\n**${description}\n
      **Type:** ${ticketType}\n
      Ticket created in ${channelMention(channelId)}`,
    )
    .setColor(env.ACCENT_COLOUR);

  return embed;
}
