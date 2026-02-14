import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v4 as uuid } from "uuid";

export const scheduledAnnounces = sqliteTable("scheduled_announces", {
  id: text()
    .primaryKey()
    .$defaultFn(() => uuid()),
  guildId: text().notNull(),
  channelId: text().notNull(),
  userId: text().notNull(),
  content: text({ mode: "json" }).notNull(),
  sendAt: integer().notNull(),
  createdAt: integer().notNull(),
});

export const users = sqliteTable("users", {
  snowflake: text().primaryKey(),
  discordUser: text().notNull(),
  zID: text().notNull(),
  name: text().notNull(),
  distro: text(),
  verifiedAt: integer().notNull(),
});

export const tickets = sqliteTable("tickets", {
  id: integer().primaryKey({ autoIncrement: true }),
  guildId: text().notNull(),
  channelId: text().notNull(),
  userId: text().notNull(),
  status: text().notNull().default("open"),
  createdAt: integer().notNull(),
});
