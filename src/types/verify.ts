export interface StoredOTP {
  OTP: string;
  attempts: number;
  createdAt: number;
}

export type OTPError =
  | "internal_error"
  | "not_found_expired"
  | "ratelimit_exceeded"
  | "attempts_exceeded"
  | "mismatch";

export type OTPResult<T, E = OTPError> =
  | { success: true; data?: T }
  | { success: false; error: E };

export interface UserData {
  snowflake: string;
  discordUser: string;
  zID: string;
  name: string;
  distro: string;
}
