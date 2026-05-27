import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET || "dev-secret-do-not-use-in-prod";
const TOKEN_TTL_MS = 30 * 60 * 1000;

export function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function checkPassword(password, hash) {
  return hashPassword(password) === hash;
}

export function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS })).toString(
    "base64url",
  );
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
