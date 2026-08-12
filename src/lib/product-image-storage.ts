import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');
const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export async function saveProductImage(file: File): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
  }

  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum size is 5MB');
  }

  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/uploads/products/${filename}`;
}
