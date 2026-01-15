import { eq, lte } from "drizzle-orm";
import { db } from "../../db/db";
import { scheduledAnnounces } from "../../db/schema";
import { BotClient } from "../../types/client";
import { APIEmbed } from "discord.js";

/* checks for any announcements which are available to send */
export async function checkAnnounce(client: BotClient) {
  const toSend = await db
    .select()
    .from(scheduledAnnounces)
    .where(lte(scheduledAnnounces.sendAt, Math.floor(Date.now() / 1000)));

  for (const announce of toSend) {
    const channel = await client.channels.fetch(announce.channelId);
    if (channel?.isSendable() && channel?.isTextBased()) {
      await channel.send({ embeds: [announce.content as APIEmbed] });
    }

    await db
      .delete(scheduledAnnounces)
      .where(eq(scheduledAnnounces.id, announce.id));
  }
}
