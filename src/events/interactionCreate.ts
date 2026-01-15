import {
  BaseInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Events,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";
import { BotClient } from "../types/client";
import {
  handleVerifyEnterCodeInteraction,
  handleVerifyGetCodeInteraction,
  handleVerifySendCode,
  handleVerifySubmitCode,
} from "../commands/verify/interactions";

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction: BaseInteraction) {
    const client = interaction.client as BotClient;

    /* delegate to handler based on interaction type */
    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(client, interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  },
};

/**
 * Handles chat input command interactions received by
 * the bot (slash commands)
 */
async function handleChatInputCommand(
  client: BotClient,
  interaction: ChatInputCommandInteraction,
) {
  try {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
    return;
  } catch (error) {
    sendFailedMessage(interaction, error);
  }
}

/**
 * Handles button submission interactions received by the bot.
 */
async function handleButton(interaction: ButtonInteraction) {
  try {
    switch (interaction.customId) {
      /* verification */
      case "verify_getCode": {
        handleVerifyGetCodeInteraction(interaction);
        break;
      }
      case "verify_enterCode": {
        handleVerifyEnterCodeInteraction(interaction);
        break;
      }
    }
  } catch (e) {
    await sendFailedMessage(interaction, e);
  }
}

/**
 * Handles modal submission interactions received by the bot.
 */
async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  try {
    switch (interaction.customId) {
      case "verify_getCode_modal": {
        handleVerifySendCode(interaction);
        break;
      }
      case "verify_enterCode_modal": {
        handleVerifySubmitCode(interaction);
        break;
      }
    }
  } catch (e) {
    await sendFailedMessage(interaction, e);
  }
}

/**
 * Replies to an interaction to indicate failure, logging the error.
 */
async function sendFailedMessage(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction,
  error: unknown,
) {
  console.error(error);

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({
      content: "There was an error while executing this command.",
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: "There was an error while executing this command.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
