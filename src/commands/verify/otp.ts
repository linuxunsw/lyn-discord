import Keyv from "keyv";
import { OTPResult, StoredOTP } from "../../types/verify";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../../env";

/* 10min ttl */
const TTL = 600000;
const MAX_ATTEMPTS = 3;
const OTP_LENGTH = 6;

export const OTPStore = new Keyv<StoredOTP>({ ttl: TTL });

/**
 * Create or replace OTP entry given user snowflake and OTP code.
 */
export async function createOrReplaceOTP(
  snowflake: string,
  code: string,
): Promise<OTPResult<void>> {
  const hash = hashOTP(code);
  const entry: StoredOTP = {
    OTP: hash,
    attempts: 0,
    createdAt: Math.floor(Date.now() / 1000),
  };

  const result = await OTPStore.set(snowflake, entry);
  if (!result) {
    return { success: false, error: "internal_error" };
  } else {
    return { success: true };
  }
}

/**
 * Gets the active OTP entry for a given user snowflake.
 */
export async function activeOTP(
  snowflake: string,
): Promise<OTPResult<StoredOTP>> {
  const entry = await OTPStore.get(snowflake);
  if (!entry) {
    return { success: false, error: "not_found_expired" };
  } else {
    return { success: true, data: entry };
  }
}

/**
 * Validates a plaintext code with corresponding entry
 */
export async function validateAndConsumeOTP(
  snowflake: string,
  code: string,
): Promise<OTPResult<void>> {
  const entry = await OTPStore.get(snowflake);
  if (!entry) {
    return { success: false, error: "not_found_expired" };
  }

  const equal = compareOTP(code, entry.OTP);
  /* increment attempt counter (& delete entry if req) */
  if (!equal) {
    entry.attempts++;
    if (entry.attempts >= MAX_ATTEMPTS) {
      const deleteResult = await OTPStore.delete(snowflake);
      if (!deleteResult) {
        return { success: false, error: "internal_error" };
      } else {
        return { success: false, error: "attempts_exceeded" };
      }
    }

    await OTPStore.set(snowflake, entry);
    return { success: false, error: "mismatch" };
  }

  const deleteResult = await OTPStore.delete(snowflake);
  if (!deleteResult) {
    return { success: false, error: "internal_error" };
  }

  return { success: true };
}

/* Consumes an OTP code owned by a zID unconditionally */
export async function consumeIfOTPExists(
  zID: string,
): Promise<OTPResult<void>> {
  const result = await OTPStore.delete(zID);
  if (!result) {
    return { success: false, error: "not_found_expired" };
  }

  return { success: true };
}

export function generateOTP(): string {
  const maximum = Math.pow(10, OTP_LENGTH);
  return randomInt(maximum).toString().padStart(OTP_LENGTH, "0");
}

function hashOTP(code: string): string {
  return createHmac("sha256", env.OTP_SECRET)
    .update(code)
    .digest("hex");
}

function compareOTP(code: string, expected: string) {
  const given = hashOTP(code);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}
