import {
  EmbedBuilder,
  inlineCode,
  TextInputBuilder,
} from "@discordjs/builders";
import {
  ButtonInteraction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputStyle,
} from "discord.js";
import { createOrReplaceOTP, generateOTP, validateAndConsumeOTP } from "./otp";
import { UserData, OTPError, OTPResult } from "../../types/verify";
import Keyv from "keyv";
import { sendOTPMail, zIDToEmail } from "./mail";
import { users } from "../../db/schema";
import { db } from "../../db/db";

/* 15min ttl on temp data */
const DATA_TTL = 30 * 60 * 1000;
/* stores user data while waiting for verification */
const tempUserStore = new Keyv<UserData>({ ttl: DATA_TTL });

/**
 * Handles displaying the `Get Code` modal upon receiving the appropriate
 * button interaction from the verification menu.
 */
export async function handleVerifyGetCodeInteraction(
  interaction: ButtonInteraction,
) {
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
  const userData = await saveVerifySendUserInfo(interaction);

  /* create OTP */
  const otp = generateOTP();
  const result = await createOrReplaceOTP(userData.snowflake, otp);
  if (result.success === false) {
    await OTPInteractionErrorReply(interaction, result.error);
  }

  /* send mail */
  try {
    sendOTPMail(otp, userData.zID);
  } catch (e) {
    console.log(e);
    await OTPInteractionErrorReply(interaction, "internal_error");
  }

  /* send dm to user saying email sent & next steps */
  await emailSentDM(interaction, zIDToEmail(userData.zID));
  interaction.reply({
    content: "Check your mail!",
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Temporarily saves user information while waiting for OTP confirm.
 * Returns a copy of the user data fetched from the `verify_getCode` modal.
 */
async function saveVerifySendUserInfo(
  interaction: ModalSubmitInteraction,
): Promise<UserData> {
  const zID = interaction.fields.getTextInputValue("verify_getCode_modal_zID");
  const name = interaction.fields.getTextInputValue(
    "verify_getCode_modal_name",
  );
  const distro = interaction.fields.getTextInputValue(
    "verify_getCode_modal_distro",
  );
  const snowflake = interaction.user.id;
  const discordUser = interaction.user.username;

  // save modal data
  const modalData: UserData = {
    snowflake,
    discordUser,
    name,
    zID,
    distro,
  };
  await tempUserStore.set(snowflake, modalData);
  // TODO: handle error in setting user
  // TODO: verify zID is valid

  return modalData;
}

async function emailSentDM(interaction: ModalSubmitInteraction, email: string) {
  const DMChannel = await interaction.user.createDM();
  DMChannel.send({
    embeds: [buildEmailSentDMContent(email)],
  });
}

/**
 * Builds the content of the email sent DM, received after submitting the `verify_getCode` modal
 */
function buildEmailSentDMContent(email: string): EmbedBuilder {
  const DMContent = `
        \u200b\n❁ ➔ **We've sent you some mail**\n
        > Please check your email and enter the code you've received back into the prompt given by the second button in order to verify yourself as ${inlineCode(email)}\n\u200b
        ⚜ ➔ **Notes**
        >>> The mail will most likely appear in your spam/junk mail.
        If you are forwarding to a Gmail account, it will most likely appear in the main inbox on the forwarded account.
        Requesting a new code will invalidate your previously requested code.
      `;

  return new EmbedBuilder()
    .setTitle("You've got mail!")
    .setDescription(DMContent)
    .setColor(0xfbc630);
}

async function WelcomeDM(interaction: ModalSubmitInteraction) {
  const DMChannel = await interaction.user.createDM();
  DMChannel.send({
    embeds: [buildWelcomeDMContent()],
  });
}

/**
 * Builds the content of the welcome DM, received after successfully submitting the `verify_enterCode` modal
 */
function buildWelcomeDMContent(): EmbedBuilder {
  const DMContent = `
      > Welcome to the server!, Please follow the rules :>
      `;

  return new EmbedBuilder()
    .setTitle("Verification successful")
    .setDescription(DMContent)
    .setColor(0xfbc630);
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
  if (validateResult.success === false) {
    await OTPInteractionErrorReply(interaction, validateResult.error);
    return;
  }

  const registerResult = await registerUser(snowflake);
  if (registerResult.success == false) {
    await OTPInteractionErrorReply(interaction, registerResult.error);
    return;
  }

  // TODO: apply roles
  // dm user
  await WelcomeDM(interaction);
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
  };

  await db.insert(users).values(user);
  return { success: true };
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
