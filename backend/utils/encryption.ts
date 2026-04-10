import crypto from 'crypto';
import dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config();

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'neural-ops-vault-key-2026';

export function getEncryptionKey(email: string): Buffer {
  return crypto.createHash('sha256').update(email + ENCRYPTION_SECRET).digest();
}

export function encrypt(text: string, email: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey(email);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string, email: string): string {
  if (!encryptedText) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = getEncryptionKey(email);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText;
  }
}
