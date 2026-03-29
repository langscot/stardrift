import * as OTPAuth from "otpauth";

/** Generates a new random base32 TOTP secret. */
export function generateSecret(): string {
  return new OTPAuth.Secret().base32;
}

/** Verifies a 6-digit TOTP token against a stored base32 secret. Allows ±1 window for clock skew. */
export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.validate({ token, window: 1 }) !== null;
}

/** Returns an otpauth:// URI for use with any authenticator app. */
export function totpUri(secret: string, label: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: "Stardrift",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}
