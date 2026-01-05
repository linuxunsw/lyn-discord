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
    .setColor(0xfbc630);

  await interaction.reply({
    embeds: [listEmbed],
    flags: MessageFlags.Ephemeral,
  });
}
