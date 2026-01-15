import {
  ActionRowBuilder,
  blockQuote,
  bold,
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

module.exports = {
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
    // TODO: permissions check
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
    .setTitle("Verification")
    .setDescription(
      `❁ ➔ ${bold("Please verify yourself")}
      ${blockQuote(
        `In order to gain access to the server, please verify yourself using your zID through email.\n
        • Press ${inlineCode("Get Code")} and enter your zID
        • Check your email for a code ${bold("(make sure to check spam!)")}
        • Press ${inlineCode("Enter Code")} button and enter the code from the email
        • Congratulations, you’re verified!

        If you have any feedback or issues regarding the verification process, please [visit this form](https://docs.google.com/forms/d/e/1FAIpQLScvqcvp1ymFoq1VRAS2yIVUr_MNRB9WP9wzIwDQz63S8pEmwQ/viewform?usp=sf_link)`,
      )}`,
    )
    .setColor(0xfbc630);

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
