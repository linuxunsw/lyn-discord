import {
  APIEmbed,
  ChatInputCommandInteraction,
  MessageFlags,
  subtext,
  time,
} from "discord.js";
import { db } from "../../db/db";
import { scheduledAnnounces } from "../../db/schema";
import { channelMention, EmbedBuilder } from "@discordjs/builders";
import { env } from "../../env";

export async function listAnnounce(interaction: ChatInputCommandInteraction) {
  const list = await db.select().from(scheduledAnnounces);
  const text = list
    .map(
      (item) =>
        `**${(item.content as APIEmbed).title}** @ ${time(item.sendAt)} (${channelMention(item.channelId)})\n${subtext("id: " + item.id)}`,
    )
    .join("\n");

  const listEmbed = new EmbedBuilder()
    .setTitle("📅 Currently scheduled announcements")
    .setDescription(text)
    .setColor(env.ACCENT_COLOUR);

  await interaction.reply({
    embeds: [listEmbed],
    flags: MessageFlags.Ephemeral,
  });
}
