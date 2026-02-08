import { GuildMember } from "discord.js";
import { db } from "../db/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { env } from "../env";

const whitelistedRoles = env.WHITELISTED_ROLES;
const whitelistedUsers = env.WHITELISTED_USERS;

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
export async function isVerified(snowflake: string): Promise<boolean> {
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.snowflake, snowflake))
    .get();
  return existingUser !== undefined;
}
