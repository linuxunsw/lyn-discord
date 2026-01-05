import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { validate } from "uuid";
import { db } from "../../db/db";
import { scheduledAnnounces } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function cancelScheduledAnnounce(
  interaction: ChatInputCommandInteraction,
) {
  const id = interaction.options.getString("id");
  if (!id || !validate(id)) {
    await interaction.reply({
      content: "Please include a valid id.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await db.delete(scheduledAnnounces).where(eq(scheduledAnnounces.id, id));
    await interaction.reply({
      content: "Successfully deleted scheduled announcement.",
      flags: MessageFlags.Ephemeral,
    });
  } catch {
    await interaction.reply({
      content:
        "There was a problem deleting that entry. Please ensure you provided a valid id.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
