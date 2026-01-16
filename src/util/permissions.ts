import { GuildMember } from "discord.js";
import { whitelistedRoles, whitelistedUsers } from "../config";

/**
 * check if a user's id is whitelisted or if it has a whitelisted role
 */
export function isWhitelisted(user: GuildMember): boolean {
  return (
    whitelistedUsers.includes(user.user.id) ||
    user.roles.cache.some((role) => whitelistedRoles.includes(role.id))
  );
}
