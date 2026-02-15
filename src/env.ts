import { getLogger } from "./log";

const envLogger = getLogger("env");

function optionalNumber(name: string, fallback: number): number {
  const value = Bun.env[name];
  if (!value) return fallback;
  const parsed = parseInt(value);
  if (isNaN(parsed)) return fallback;
  return parsed;
}

function optionalList(name: string): string[] {
  const value = Bun.env[name];
  if (!value) return [];
  return value.split(",").map((i) => i.trim());
}

function optionalString(name: string, fallback: string): string {
  const value = Bun.env[name];
  if (!value) return fallback;
  return value;
}

function required(name: string): string {
  const value = Bun.env[name];
  if (!value) {
    envLogger.error(`Missing ${name} environment variable`);
    return "";
  }

  return value;
}

export const env = {
  DISCORD_TOKEN: required("DISCORD_TOKEN"),
  CLIENT_ID: required("CLIENT_ID"),
  GUILD_ID: required("GUILD_ID"),

  TICKET_CATEGORY_ID: required("TICKET_CATEGORY_ID"),
  TICKET_NOTIFY_CHANNEL_ID: required("TICKET_NOTIFY_CHANNEL_ID"),
  TICKET_RESPONSE_ROLE: required("TICKET_RESPONSE_ROLE"),

  WHITELISTED_USERS: optionalList("WHITELISTED_USERS"),
  WHITELISTED_ROLES: optionalList("WHITELISTED_ROLES"),
  VERIFIED_ROLE: required("VERIFIED_ROLE"),

  SOCIETY_NAME: optionalString("SOCIETY_NAME", "Linux Society"),
  ACCENT_COLOUR: optionalNumber("ACCENT_COLOUR", 0xfbc630),

  EMAIL_DOMAIN: required("EMAIL_DOMAIN"),
  VERIFY_EMAIL: required("VERIFY_EMAIL"),
  RESEND_KEY: required("RESEND_KEY"),

  DB_FILE_NAME: required("DB_FILE_NAME"),
  OTP_SECRET: required("OTP_SECRET"),

  MONGODB_URI: optionalString("MONGODB_URI", ""),
  NODE_ENV: optionalString("NODE_ENV", "development"),
};
