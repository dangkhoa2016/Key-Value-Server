const crypto = require('crypto');

const ivLength = 16;
const saltLength = 64;
const tagLength = 16;
const tagPosition = saltLength + ivLength;
const encryptedPosition = tagPosition + tagLength;
const secret = process.env.CONTENT_SECRET;

const getKey = (salt) => {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha512');
};

class Cryptr {
  constructor(algorithm = null) {
    if (!secret || typeof (secret) !== 'string') {
      throw new Error('Cryptr: secret must be a non-0-length string');
    }

    this.algorithm = algorithm || 'aes-256-gcm';
  }

  encrypt(value) {
    return new Promise((resolve, reject) => {
      if (value === null) {
        reject(new Error('encrypt: value must not be null or undefined'));
        return;
      }

      const iv = crypto.randomBytes(ivLength);
      const salt = crypto.randomBytes(saltLength);

      const key = getKey(salt);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);

      const tag = cipher.getAuthTag();

      resolve(Buffer.concat([salt, iv, tag, encrypted]).toString('hex'));
    });
  }

  decrypt(value) {
    return new Promise((resolve, reject) => {
      if (value === null) {
        reject(new Error('decrypt: value must not be null or undefined'));
        return;
      }

      const stringValue = Buffer.from(String(value), 'hex');

      const salt = stringValue.slice(0, saltLength);
      const iv = stringValue.slice(saltLength, tagPosition);
      const tag = stringValue.slice(tagPosition, encryptedPosition);
      const encrypted = stringValue.slice(encryptedPosition);

      const key = getKey(salt);

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      decipher.setAuthTag(tag);

      resolve(decipher.update(encrypted) + decipher.final('utf8'));
    });
  }
}

module.exports = new Cryptr();
