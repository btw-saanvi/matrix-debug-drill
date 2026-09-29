const crypto = require('crypto');

function hashValue(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function encryptValue(text, key) {
  const derivedKey = crypto.scryptSync(key, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptValue(encryptedWithIv, key) {
  const parts = encryptedWithIv.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const derivedKey = crypto.scryptSync(key, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { hashValue, encryptValue, decryptValue };
