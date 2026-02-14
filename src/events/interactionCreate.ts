import {
  BaseInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Events,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";
import { BotClient } from "../types/client";
import { getLogger } from "../log";

const log = getLogger("interaction");
import {
  handleVerifyEnterCodeInteraction,
  handleVerifyGetCodeInteraction,
  handleVerifySendCode,
  handleVerifySubmitCode,
} from "../commands/verify/interactions";
import { displayTicketModal, newTicket } from "../commands/ticket/interactions";

export default {
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
    await sendFailedMessage(interaction, error);
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
        await handleVerifyGetCodeInteraction(interaction);
        break;
      }
      case "verify_enterCode": {
        await handleVerifyEnterCodeInteraction(interaction);
        break;
      }
      case "newTicket_init": {
        await displayTicketModal(interaction);
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
        await handleVerifySendCode(interaction);
        break;
      }
      case "verify_enterCode_modal": {
        await handleVerifySubmitCode(interaction);
        break;
      }
      case "newTicket_form": {
        await newTicket(interaction);
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
  log.error(error, "Interaction failed");

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
