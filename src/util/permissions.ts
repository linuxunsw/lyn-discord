import { GuildMember } from "discord.js";
import { whitelistedRoles, whitelistedUsers } from "../config";
import { db } from "../db/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * check if a user's id is whitelisted or if it has a whitelisted role
 */
export function isWhitelisted(user: GuildMember): boolean {
  return (
    whitelistedUsers.includes(user.user.id) ||
    user.roles.cache.some((role) => whitelistedRoles.includes(role.id))
  );
}

/**
 * check if a user is already verified by snowflake
 */
export function isVerified(snowflake: string): boolean {
  const existingUser = db
    .select()
    .from(users)
    .where(eq(users.snowflake, snowflake))
    .get();
  return existingUser !== undefined;
}
