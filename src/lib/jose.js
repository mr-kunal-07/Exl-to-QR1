import { EncryptJWT, jwtDecrypt } from 'jose';

// Base64-encoded 32-byte (256-bit) secret
const JWT_SECRET = "sN7Y+q6YyE3F2wZtUvGZpZgYyJQFQH7KfT7p1F5kYZQ=";
const JWT_EXPIRES_IN = '7d';

// ✅ FIXED: decode base64 secret, NOT TextEncoder
const getSecretKey = () => Buffer.from(JWT_SECRET, "base64");

const parseExpiry = (expStr) => {
  const unit = expStr.slice(-1);
  const value = parseInt(expStr.slice(0, -1));
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: throw new Error('Invalid expiry format');
  }
};

// ---------------- ENCRYPT ----------------
export const signToken = async (payload, expiresIn = JWT_EXPIRES_IN) => {
  const key = getSecretKey();
  const expSeconds = parseExpiry(expiresIn);
  const expirationTime = Math.floor(Date.now() / 1000) + expSeconds;

  return await new EncryptJWT({ ...payload, exp: expirationTime })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .encrypt(key);
};

// ---------------- DECRYPT ----------------
export const verifyToken = async (token) => {
  const key = getSecretKey();
  const { payload } = await jwtDecrypt(token, key);
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
    throw new Error('Token expired');
  return payload;
};
