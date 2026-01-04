import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  ComponentType,
  Embed,
  EmbedBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  NewsChannel,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

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
  } catch {
    await interaction.followUp({
      content: "Something went wrong.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

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

async function handleAnnouncementModalSubmit(
  interaction: ModalSubmitInteraction,
) {
  const title = interaction.fields.getTextInputValue("announce_create_title");
  const description = interaction.fields.getTextInputValue(
    "announce_create_desc",
  );
  const uploaded = interaction.fields.getUploadedFiles("announce_create_image");
  const file = uploaded?.first();

  const previewEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0xfbc630);

  if (file) previewEmbed.setImage(file.url);

  /* confirm/cancel buttons */
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("announce_confirm")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success),
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
  }
}
