import {
  APIEmbed,
  ChatInputCommandInteraction,
  inlineCode,
  MessageFlags,
} from "discord.js";
import { validate } from "uuid";
import { db } from "../../db/db";
import { scheduledAnnounces } from "../../db/schema";
import { eq } from "drizzle-orm";

/* gets a scheduled announcement and displays preview */
export async function previewAnnounce(
  interaction: ChatInputCommandInteraction,
) {
  const id = interaction.options.getString("id");
  if (!id || !validate(id)) {
    await interaction.reply({
      content:
        "Please enter a valid **scheduled** message id. This can be retrieved from /announce list.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

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

  await interaction.reply({
    embeds: [message[0].content as APIEmbed],
    flags: MessageFlags.Ephemeral,
  });
}
