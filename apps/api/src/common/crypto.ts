import { createHash, randomBytes, randomInt } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function newSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function inviteCode(): string {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export function otpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}
