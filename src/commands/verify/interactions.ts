import { EmbedBuilder } from "@discordjs/builders";
import {
  ButtonInteraction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { consumeRateLimit } from "./rateLimit";
import { createOrReplaceOTP, generateOTP, validateAndConsumeOTP } from "./otp";
import { UserData, OTPError, OTPResult } from "../../types/verify";
import Keyv from "keyv";
import { sendOTPMail } from "./mail";
import { users } from "../../db/schema";
import { db } from "../../db/db";
import { getLogger } from "../../log";
import {
  getCodeDMContent,
  getCodeDMTitle,
  verifiedRole,
  WelcomeDMContent,
  WelcomeDMTitle,
  zIDEmail,
} from "../../config";
import { isValidZID } from "../../util/validation";
import { isVerified } from "../../util/permissions";
import { client } from "../..";
import { env } from "../../env";

const log = getLogger("verify");


/* 15min ttl on temp data */
const DATA_TTL = 30 * 60 * 1000;
/* stores user data while waiting for verification */
const tempUserStore = new Keyv<UserData>({ ttl: DATA_TTL });

/**
 * checks if user is already verified and replies if so
 */
async function alreadyVerifiedReply(
  interaction: ButtonInteraction,
): Promise<boolean> {
  if (isVerified(interaction.user.id)) {
    await interaction.reply({
      content: "You are already verified!",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  return false;
}

/**
 * Handles displaying the `Get Code` modal upon receiving the appropriate
 * button interaction from the verification menu.
 */
export async function handleVerifyGetCodeInteraction(
  interaction: ButtonInteraction,
) {
  if (await alreadyVerifiedReply(interaction)) return;
  const modal = buildVerifyGetCodeModal();
  await interaction.showModal(modal);
  return;
}

/**
 * Handles displaying the `Enter Code` modal upon receiving the appropriate
 * button interaction from the verification menu.
 */
export async function handleVerifyEnterCodeInteraction(
  interaction: ButtonInteraction,
) {
  if (await alreadyVerifiedReply(interaction)) return;
  const modal = buildVerifyEnterCodeModal();
  await interaction.showModal(modal);
  return;
}

/**
 * Handles the modal submission interaction for the `verify_getCode` modal,
 * sending the OTP code to the user's email.
 */
export async function handleVerifySendCode(
  interaction: ModalSubmitInteraction,
) {
  const snowflake = interaction.user.id;
  const username = interaction.user.globalName;

  /* check and consume rate limit */
  if (await consumeRateLimit(snowflake)) {
    await OTPInteractionErrorReply(interaction, "ratelimit_exceeded");
    log.info(`${username} has exceeded rate limits.`);
    return;
  }

  let userData: UserData;
  try {
    const saveResult = await saveVerifySendUserInfo(interaction);
    if (!saveResult.success) {
      await OTPInteractionErrorReply(interaction, saveResult.error);
      log.error({ saveResult }, "Error saving user verification information")
      return;
    }
    if (!saveResult.data) {
      await OTPInteractionErrorReply(interaction, "internal_error");
      log.error({ saveResult }, "Error saving user verification information")
      return;
    }
    userData = saveResult.data;
  } catch (e) {
    const error = e as Error;
    if (error.message === "INVALID_ZID") {
      await interaction.reply({
        content: "Please enter a valid zID.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "There was an error when requesting an OTP. Please try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  /* create OTP */
  const otp = generateOTP();
  const result = await createOrReplaceOTP(userData.snowflake, otp);
  if (!result.success) {
    log.error({ result }, "Error saving user OTP")
    await OTPInteractionErrorReply(interaction, result.error);
    return;
  }

  /* send mail */
  try {
    await sendOTPMail(otp, userData.zID);
  } catch (e) {
    log.error(e, "Failed to send OTP mail");
    await OTPInteractionErrorReply(interaction, "internal_error");
    return;
  }

  /* send dm to user saying email sent & next steps */
  try {
    await emailSentDM(interaction, zIDEmail(userData.zID));
    await interaction.reply({
      content: "Check your mail!",
      flags: MessageFlags.Ephemeral,
    });
  } catch (e) {
    log.error({ e }, "Failed to send DM to user.");
    await OTPInteractionErrorReply(interaction, "internal_error");
  }
}

/**
 * Temporarily saves user information while waiting for OTP confirm.
 * Returns a copy of the user data fetched from the `verify_getCode` modal.
 */
async function saveVerifySendUserInfo(
  interaction: ModalSubmitInteraction,
): Promise<OTPResult<UserData>> {
  const zID = interaction.fields
    .getTextInputValue("verify_getCode_modal_zID")
    .trim()
    .toLowerCase();
  const name = interaction.fields
    .getTextInputValue("verify_getCode_modal_name")
    .trim();
  const distro = interaction.fields
    .getTextInputValue("verify_getCode_modal_distro")
    .trim();
  const snowflake = interaction.user.id;
  const discordUser = interaction.user.username;

  if (!isValidZID(zID)) {
    throw new Error("INVALID_ZID");
  }

  // save modal data
  const modalData: UserData = {
    snowflake,
    discordUser,
    name,
    zID,
    distro,
  };
  const result = await tempUserStore.set(snowflake, modalData);
  if (!result) {
    return { success: false, error: "internal_error" };
  }

  return { success: true, data: modalData };
}

async function emailSentDM(interaction: ModalSubmitInteraction, email: string) {
  const DMChannel = await interaction.user.createDM();
  await DMChannel.send({
    embeds: [buildEmailSentDMContent(email)],
  });
}

/**
 * Builds the content of the email sent DM, received after submitting the `verify_getCode` modal
 */
function buildEmailSentDMContent(email: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(getCodeDMTitle)
    .setDescription(getCodeDMContent(email))
    .setColor(env.ACCENT_COLOUR);
}

async function WelcomeDM(interaction: ModalSubmitInteraction) {
  const DMChannel = await interaction.user.createDM();
  await DMChannel.send({
    embeds: [buildWelcomeDMContent()],
  });
}

/**
 * Builds the content of the welcome DM, received after successfully submitting the `verify_enterCode` modal
 */
function buildWelcomeDMContent(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(WelcomeDMTitle)
    .setDescription(WelcomeDMContent)
    .setColor(env.ACCENT_COLOUR);
}

/**
 * Handles the modal submission interaction for the `Enter Code` modal,
 * verifying the OTP code entered by the user.
 */
export async function handleVerifySubmitCode(
  interaction: ModalSubmitInteraction,
) {
  /* get code from modal */
  const snowflake = interaction.user.id;
  const code = interaction.fields.getTextInputValue(
    "verify_enterCode_modal_code",
  );

  /* verify against otpstore */
  const validateResult = await validateAndConsumeOTP(snowflake, code);
  if (!validateResult.success) {
    await OTPInteractionErrorReply(interaction, validateResult.error);
    return;
  }

  const registerResult = await registerUser(snowflake);
  if (!registerResult.success) {
    await OTPInteractionErrorReply(interaction, registerResult.error);
    return;
  }

  try {
    await applyVerifiedRole(interaction);
  } catch (e) {
    log.error({ e }, "Failed to apply verified role to user.")
    await OTPInteractionErrorReply(interaction, "internal_error");
    return;
  }

  /* dm user welcome message */
  await WelcomeDM(interaction);
  await interaction.reply({
    content: "Verification successful!",
    flags: MessageFlags.Ephemeral,
  });
  return;
}

async function registerUser(snowflake: string): Promise<OTPResult<void>> {
  const userData = await tempUserStore.get(snowflake);
  if (!userData) {
    return { success: false, error: "not_found_expired" };
  }

  const user: typeof users.$inferInsert = {
    snowflake: userData.snowflake,
    discordUser: userData.discordUser,
    zID: userData.zID,
    name: userData.name,
    distro: userData.distro,
    verifiedAt: Math.floor(Date.now() / 1000),
  };

  try {
    await db.insert(users).values(user);
    return { success: true };
  } catch {
    return { success: false, error: "internal_error" };
  }
}

function buildVerifyGetCodeModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`verify_getCode_modal`)
    .setTitle("Enter some information about yourself");

  const zIDLabel = new LabelBuilder()
    .setLabel("zID (including the z)")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId("verify_getCode_modal_zID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true),
    );

  const nameLabel = new LabelBuilder()
    .setLabel("Full Name")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId("verify_getCode_modal_name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true),
    );

  const distroLabel = new LabelBuilder()
    .setLabel("What's your favourite distro? (optional)")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId("verify_getCode_modal_distro")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false),
    );

  modal.addLabelComponents(zIDLabel, nameLabel, distroLabel);
  return modal;
}

function buildVerifyEnterCodeModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`verify_enterCode_modal`)
    .setTitle("Verify yourself");

  const codeLabel = new LabelBuilder()
    .setLabel("Verification Code")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId("verify_enterCode_modal_code")
        .setStyle(TextInputStyle.Short)
        .setRequired(true),
    );

  modal.addLabelComponents(codeLabel);
  return modal;
}

async function OTPInteractionErrorReply(
  interaction: ModalSubmitInteraction | ButtonInteraction,
  reason: OTPError,
) {
  await interaction.reply({
    content: OTPErrToString(reason),
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Converts an OTPError to a string which can be displayed to
 * the user.
 */
function OTPErrToString(error: OTPError): string {
  let fullReason: string;
  switch (error) {
    case "internal_error": {
      fullReason = "There was an internal error. Please try again.";
      break;
    }
    case "attempts_exceeded": {
      fullReason =
        "Number of attempts have been exceeded for this OTP. Please request a new OTP to continue.";
      break;
    }
    case "mismatch": {
      fullReason = "OTP was incorrect, please try again.";
      break;
    }
    case "not_found_expired": {
      fullReason =
        "OTP expired or has not been requested, please request a new OTP.";
      break;
    }
    case "ratelimit_exceeded": {
      fullReason = "Too many attempts, please try again later.";
      break;
    }
  }

  return fullReason;
}

/* applies the verification role to the user */
async function applyVerifiedRole(interaction: ModalSubmitInteraction) {
  if (!process.env.GUILD_ID) {
    throw new Error("GUILD_ID environment variable is not set");
  }
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const role = await guild.roles.fetch(verifiedRole);
  if (!role) {
    throw new Error("Verified role not found");
  }
  const user = await guild.members.fetch(interaction.user.id);
  await user.roles.add(role);
}
