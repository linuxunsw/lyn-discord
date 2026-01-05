import {
  APIEmbed,
  ChatInputCommandInteraction,
  FileUploadBuilder,
  inlineCode,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { db } from "../../db/db";
import { scheduledAnnounces } from "../../db/schema";
import { eq } from "drizzle-orm";
import { buildAnnounceEmbed } from "./new";
import { client } from "../..";

export async function editScheduledAnnounce(
  interaction: ChatInputCommandInteraction,
  id: string,
) {
  const message = await db
    .select()
    .from(scheduledAnnounces)
    .where(eq(scheduledAnnounces.id, id));

  if (message.length === 0) {
    await interaction.reply({
      content: `Could not find message with id ${inlineCode(id)}. Please try again.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  /* prefill edit modal with the currently scheduled content */
  const content = message[0].content as APIEmbed;
  const modal = buildEditScheduledModal(
    content.title as string,
    content.description as string,
  );
  await interaction.showModal(modal);

  const modalInteraction = await interaction
    .awaitModalSubmit({
      filter: (modalInteraction) =>
        modalInteraction.user.id === interaction.user.id &&
        modalInteraction.customId == "announce_edit_scheduled",
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

  /* create updated embed */
  const title = modalInteraction.fields.getTextInputValue("title");
  const description = modalInteraction.fields.getTextInputValue("desc");
  const uploaded = modalInteraction.fields.getUploadedFiles("image")?.first();
  const newEmbed = buildAnnounceEmbed(title, description, uploaded);

  await db
    .update(scheduledAnnounces)
    .set({ content: newEmbed })
    .where(eq(scheduledAnnounces.id, id));

  await modalInteraction.reply({
    content: `Updated scheduled announcement ${inlineCode(id)}:`,
    embeds: [newEmbed],
    flags: MessageFlags.Ephemeral,
  });
  return;
}

export async function editSentAnnounce(
  interaction: ChatInputCommandInteraction,
  channelId: string,
  messageId: string,
) {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    interaction.reply({
      content: "Please provide a valid channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  /* get message and confirm embeds are present */
  const message = await channel.messages.fetch(messageId);
  if (!message || !message.editable) {
    interaction.reply({
      content:
        "Please provide the correct channel and a valid, editable message id.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (message.embeds.length != 1) {
    interaction.reply({
      content: "Embed is missing or cannot be edited.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  /* prefill edit modal with embed data */
  const embed = message.embeds[0];
  const modal = buildEditSentModal(embed.title, embed.description);
  await interaction.showModal(modal);

  const modalInteraction = await interaction
    .awaitModalSubmit({
      filter: (modalInteraction) =>
        modalInteraction.user.id === interaction.user.id &&
        modalInteraction.customId == "announce_edit_sent",
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

  /* create updated embed */
  const title = modalInteraction.fields.getTextInputValue("title");
  const description = modalInteraction.fields.getTextInputValue("desc");
  const uploaded = modalInteraction.fields.getUploadedFiles("image")?.first();
  const newEmbed = buildAnnounceEmbed(title, description, uploaded);

  await message.edit({
    embeds: [newEmbed],
  });

  await modalInteraction.reply({
    content: "Updated message!",
    flags: MessageFlags.Ephemeral,
  });
}

function buildEditScheduledModal(title: string, content: string) {
  const modal = new ModalBuilder()
    .setTitle("Edit scheduled announcement")
    .setCustomId("announce_edit_scheduled");

  const titleLabel = new LabelBuilder()
    .setLabel("Title")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId("title")
        .setStyle(TextInputStyle.Short)
        .setValue(title)
        .setRequired(true),
    );

  const descriptionLabel = new LabelBuilder()
    .setLabel("Description")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId("desc")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(content)
        .setRequired(true),
    );

  const uploadLabel = new LabelBuilder()
    .setLabel("Image (optional)")
    .setDescription(
      "Uploading an image here will replace the previous attachment.",
    )
    .setFileUploadComponent(
      new FileUploadBuilder()
        .setCustomId("image")
        .setRequired(false)
        .setMaxValues(1),
    );

  modal.addLabelComponents(titleLabel, descriptionLabel, uploadLabel);
  return modal;
}

function buildEditSentModal(title: string | null, content: string | null) {
  const modal = new ModalBuilder()
    .setTitle("Edit sent announcement")
    .setCustomId("announce_edit_sent");

  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  if (title) titleInput.setValue(title);
  const titleLabel = new LabelBuilder()
    .setLabel("Title")
    .setTextInputComponent(titleInput);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("desc")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  if (content) descriptionInput.setValue(content);
  const descriptionLabel = new LabelBuilder()
    .setLabel("Description")
    .setTextInputComponent(descriptionInput);

  const uploadLabel = new LabelBuilder()
    .setLabel("Image (optional)")
    .setDescription(
      "Uploading an image here will replace the previous attachment.",
    )
    .setFileUploadComponent(
      new FileUploadBuilder()
        .setCustomId("image")
        .setRequired(false)
        .setMaxValues(1),
    );

  modal.addLabelComponents(titleLabel, descriptionLabel, uploadLabel);
  return modal;
}
