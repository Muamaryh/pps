/**
 * Security utilities for Admin Panel Authentication (Sandy Shores LSM PPS)
 * - Cryptographic SHA-256 password hashing (Web Crypto API)
 * - Anti Brute-Force lockout & cooldown management
 */

// Default credentials for LSM PPS Admin Portal
export const DEFAULT_ADMIN_PASSWORD = "@adminpps22h6";
export const DEFAULT_ADMIN_PIN = "114123";
export const DEFAULT_ADMIN_HASH = "2d7cf6e415d67c0f7997c17bd757cd331f2f66e32c75c4f8d7dda6a4657a4b68";
export const DEFAULT_PIN_HASH = "b99066b359329d84e3dc5aa09933ed3cd4dc7359a8d3b6661a590a19bbe42aa2";

/**
 * Hashes a string using standard browser Web Crypto API (SHA-256)
 * @param {string} text
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function hashPassword(text) {
  if (!text) return "";
  const msgUint8 = new TextEncoder().encode(text.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies if input password/PIN matches the stored activation hash or plain text.
 * Default PIN/password fallbacks are ONLY accepted when the stored hash is still the default
 * (once changed by Master, old default codes are completely rejected).
 * @param {string} inputPassword
 * @param {string} storedHashOrPlain
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(inputPassword, storedHashOrPlain) {
  if (!inputPassword || typeof inputPassword !== "string") return false;
  const inputTrimmed = inputPassword.trim();
  const inputHash = await hashPassword(inputTrimmed);
  const inputLowerHash = await hashPassword(inputTrimmed.toLowerCase());

  const trimmedStored =
    storedHashOrPlain && typeof storedHashOrPlain === "string"
      ? storedHashOrPlain.trim()
      : "";

  const isUsingDefaultStored =
    !trimmedStored ||
    trimmedStored.toLowerCase() === DEFAULT_ADMIN_HASH.toLowerCase() ||
    trimmedStored.toLowerCase() === DEFAULT_PIN_HASH.toLowerCase();

  // Only allow default PIN/password pair if Master hasn't changed it from default yet
  if (isUsingDefaultStored) {
    if (
      inputTrimmed === DEFAULT_ADMIN_PIN ||
      inputTrimmed === DEFAULT_ADMIN_PASSWORD ||
      inputTrimmed.toLowerCase() === DEFAULT_ADMIN_PASSWORD.toLowerCase() ||
      inputHash === DEFAULT_PIN_HASH ||
      inputHash === DEFAULT_ADMIN_HASH ||
      inputLowerHash === DEFAULT_ADMIN_HASH
    ) {
      return true;
    }
    return false;
  }

  // Strict match against custom SHA-256 hash stored in Firestore
  if (trimmedStored.length === 64 && /^[0-9a-fA-F]+$/.test(trimmedStored)) {
    if (inputHash.toLowerCase() === trimmedStored.toLowerCase()) return true;
    if (!/^\d+$/.test(inputTrimmed) && inputLowerHash.toLowerCase() === trimmedStored.toLowerCase()) {
      return true;
    }
    return false;
  }

  // Legacy plain text match (only if non-hashed custom string exists)
  return (
    inputTrimmed === trimmedStored ||
    inputTrimmed.toLowerCase() === trimmedStored.toLowerCase()
  );
}

/**
 * Strict SHA-256 verification for personal pengurus account credentials (password or PIN).
 * Does NOT accept master fallback credentials.
 * @param {string} input
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPersonalCredential(input, storedHash) {
  if (!input || typeof input !== "string" || !storedHash || typeof storedHash !== "string") {
    return false;
  }
  const cleanStored = storedHash.trim().toLowerCase();
  if (cleanStored.length !== 64 || !/^[0-9a-f]+$/.test(cleanStored)) {
    return false;
  }
  const trimmed = input.trim();
  if (!trimmed) return false;
  const exactHash = await hashPassword(trimmed);
  if (exactHash.toLowerCase() === cleanStored) return true;
  // Handle mobile auto-capitalization for non-numeric passwords
  if (!/^\d+$/.test(trimmed)) {
    const lowerHash = await hashPassword(trimmed.toLowerCase());
    if (lowerHash.toLowerCase() === cleanStored) return true;
  }
  return false;
}

const LOCKOUT_KEY = "pps_admin_lockout";
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION_SECONDS = 60;

/**
 * Gets current brute-force lockout status
 */
export function getLockoutState() {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    const stored = JSON.parse(raw);
    const now = Date.now();

    // If lockout period is currently active
    if (stored.lockoutUntil && stored.lockoutUntil > now) {
      return {
        isLocked: true,
        remainingSeconds: Math.max(1, Math.ceil((stored.lockoutUntil - now) / 1000)),
        attempts: stored.attempts || MAX_ATTEMPTS,
      };
    }

    // If lockout expired, clear lockout
    if (stored.lockoutUntil && stored.lockoutUntil <= now) {
      localStorage.removeItem(LOCKOUT_KEY);
      return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }

    // If last attempt was more than 15 minutes ago, auto-reset attempts to 0
    if (stored.lastAttemptAt && now - stored.lastAttemptAt > 15 * 60 * 1000) {
      localStorage.removeItem(LOCKOUT_KEY);
      return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }

    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: stored.attempts || 0,
    };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  }
}

/**
 * Records a failed login attempt and triggers lockout if max attempts exceeded
 */
export function recordFailedAttempt() {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    const now = Date.now();

    // Reset attempts if previous attempt was more than 15 mins ago
    let attempts = stored.attempts || 0;
    if (stored.lastAttemptAt && now - stored.lastAttemptAt > 15 * 60 * 1000) {
      attempts = 0;
    }
    const newAttempts = attempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockoutUntil = now + LOCKOUT_DURATION_SECONDS * 1000;
      localStorage.setItem(
        LOCKOUT_KEY,
        JSON.stringify({ attempts: newAttempts, lockoutUntil, lastAttemptAt: now })
      );
      return { isLocked: true, remainingSeconds: LOCKOUT_DURATION_SECONDS, attempts: newAttempts };
    }

    localStorage.setItem(
      LOCKOUT_KEY,
      JSON.stringify({ attempts: newAttempts, lockoutUntil: null, lastAttemptAt: now })
    );
    return { isLocked: false, remainingSeconds: 0, attempts: newAttempts };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attempts: 1 };
  }
}

/**
 * Resets brute-force state upon successful login
 */
export function resetLockoutState() {
  try {
    localStorage.removeItem(LOCKOUT_KEY);
  } catch {}
}
