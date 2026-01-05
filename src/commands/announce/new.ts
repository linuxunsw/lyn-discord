import { parseDate } from "chrono-node";
import {
  ActionRowBuilder,
  Attachment,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  codeBlock,
  ComponentType,
  Embed,
  EmbedBuilder,
  FileUploadBuilder,
  inlineCode,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  NewsChannel,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  time,
} from "discord.js";
import { scheduledAnnounces } from "../../db/schema";
import { db } from "../../db/db";

export async function newAnnounce(interaction: ChatInputCommandInteraction) {
  /* channel provided cannot be a DM channel, voice channel, etc., check for safety */
  const channel = interaction.options.getChannel("channel");
  if (
    !channel ||
    (channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement)
  ) {
    await interaction.reply({
      content: "No valid channel provided.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  /* show modal for announcement info, wait for submission */
  const modal = buildAnnounceModal();
  await interaction.showModal(modal);

  const modalInteraction = await interaction
    .awaitModalSubmit({
      filter: (modalInteraction) =>
        modalInteraction.user.id === interaction.user.id,
      time: 60000,
    })
    .catch(() => null);

  if (!modalInteraction) {
    await interaction.followUp({
      content: "Timed out waiting for response, please try again.",
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  /* build preview from submission */
  const previewMsg = await handleAnnouncementModalSubmit(modalInteraction);
  if (!previewMsg) {
    await interaction.followUp({
      content: "Something went wrong.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const buttonInteraction = await previewMsg
      .awaitMessageComponent({
        filter: (buttonInteraction) =>
          buttonInteraction.user.id === interaction.user.id,
        time: 60000,
        componentType: ComponentType.Button,
      })
      .catch(() => null);

    if (!buttonInteraction) {
      await interaction.followUp({
        content: "Timed out waiting for response, please try again.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await handleAnnouncementButton(
      buttonInteraction as ButtonInteraction,
      channel as TextChannel | NewsChannel,
      previewMsg.embeds[0],
    );
  } catch (err) {
    await interaction.followUp({
      content: `Something went wrong, see ${codeBlock(err as string)}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

/* builds the announcement modal to prompt for information */
function buildAnnounceModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`announce_create_modal`)
    .setTitle("New Announcement");

  const titleLabel = new LabelBuilder()
    .setLabel("Title")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId("announce_create_title")
        .setStyle(TextInputStyle.Short)
        .setRequired(true),
    );

  const descriptionLabel = new LabelBuilder()
    .setLabel("Description")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId("announce_create_desc")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true),
    );

  const uploadLabel = new LabelBuilder()
    .setLabel("Image (optional)")
    .setFileUploadComponent(
      new FileUploadBuilder()
        .setCustomId("announce_create_image")
        .setRequired(false)
        .setMaxValues(1),
    );

  modal.addLabelComponents(titleLabel, descriptionLabel, uploadLabel);
  return modal;
}

export function buildAnnounceEmbed(
  title: string,
  description: string,
  file?: Attachment,
): EmbedBuilder {
  const announceEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0xfbc630);

  if (file) announceEmbed.setImage(file.url);
  return announceEmbed;
}

async function handleAnnouncementModalSubmit(
  interaction: ModalSubmitInteraction,
) {
  const title = interaction.fields.getTextInputValue("announce_create_title");
  const description = interaction.fields.getTextInputValue(
    "announce_create_desc",
  );
  const uploaded = interaction.fields.getUploadedFiles("announce_create_image");
  const file = uploaded?.first();
  const previewEmbed = buildAnnounceEmbed(title, description, file);

  /* confirm/schedule/cancel buttons */
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("announce_confirm")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("announce_schedule")
      .setLabel("Schedule")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("announce_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger),
  );

  const response = await interaction.reply({
    embeds: [previewEmbed],
    components: [row],
    withResponse: true,
    flags: [MessageFlags.Ephemeral],
  });

  return response.resource?.message;
}

/* handles the button interactions from announcement modals */
async function handleAnnouncementButton(
  interaction: ButtonInteraction,
  channel: TextChannel | NewsChannel,
  embed: Embed,
) {
  if (interaction.customId === "announce_confirm") {
    await channel.send({ embeds: [embed] });
    await interaction.update({
      content: "Announcement sent!",
      embeds: [],
      components: [],
    });
  } else if (interaction.customId === "announce_cancel") {
    await interaction.update({
      content: "Announcement canceled.",
      embeds: [],
      components: [],
    });
  } else if (interaction.customId === "announce_schedule") {
    await scheduleAnnounce(channel, embed, interaction);
  }
}

/**
 * handles scheduling announcements
 * - prompts for time (can use natural language)
 * - adds announcement to db to be sent at time
 */
async function scheduleAnnounce(
  channel: TextChannel | NewsChannel,
  embed: Embed,
  interaction: ButtonInteraction,
) {
  const modal = buildTimestampModal();
  await interaction.showModal(modal);

  /* get timestamp from modal submission */
  const modalInteraction = await interaction
    .awaitModalSubmit({
      filter: (modalInteraction) =>
        modalInteraction.user.id === interaction.user.id,
      time: 60000,
    })
    .catch(() => null);

  if (!modalInteraction) {
    await interaction.followUp({
      content: "Timed out waiting for response, please try again.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  /* parse time */
  const sendAtRaw = modalInteraction.fields.getTextInputValue(
    "announce_schedule_time",
  );
  const sendAt = parseDate(sendAtRaw);
  if (!sendAt) {
    await modalInteraction.followUp({
      content: `Could not parse input: ${sendAtRaw}, please try again.`,
      embeds: [],
      components: [],
    });
    return;
  }

  /* schedule & add to db */
  const announce = await createScheduledAnnounce(
    channel.guildId,
    channel.id,
    interaction.user.id,
    embed,
    Math.floor(sendAt.getTime() / 1000),
  );

  if (!announce[0]) throw new Error("Insert failed/no row returned");

  await modalInteraction.reply({
    content: `Scheduled new announce @ ${time(announce[0].sendAt)}, id: ${inlineCode(announce[0].id)}`,
    embeds: [],
    components: [],
    flags: MessageFlags.Ephemeral,
  });
}

/* builds time prompt modal */
function buildTimestampModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`announce_schedule_modal`)
    .setTitle("Schedule Announcement");

  const timeLabel = new LabelBuilder()
    .setLabel("Time")
    .setDescription("Time to send message.")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId("announce_schedule_time")
        .setStyle(TextInputStyle.Short)
        .setRequired(true),
    );

  modal.addLabelComponents(timeLabel);
  return modal;
}

/* adds new scheduled announcement to db */
async function createScheduledAnnounce(
  guildId: string,
  channelId: string,
  userId: string,
  content: Embed,
  sendAt: number,
) {
  const announce: typeof scheduledAnnounces.$inferInsert = {
    guildId: guildId,
    channelId: channelId,
    userId: userId,
    content: content,
    sendAt: sendAt,
    createdAt: Math.floor(Date.now() / 1000),
  };

  return await db.insert(scheduledAnnounces).values(announce).returning();
}
