/**
 * Security utilities for Admin Panel Authentication (Sandy Shores LSM PPS)
 * - Cryptographic SHA-256 password hashing (Web Crypto API)
 * - Anti Brute-Force lockout & cooldown management
 */

// Default hash for initial installation (SHA-256 of "pps123123")
export const DEFAULT_ADMIN_HASH = "259ccb1e006f68032bb7659d2b4d941132d0492e6530073a15271665dd29284e";

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
 * Verifies if input password matches the stored hash or legacy plain text
 * @param {string} inputPassword
 * @param {string} storedHashOrPlain
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(inputPassword, storedHashOrPlain) {
  if (!inputPassword || typeof inputPassword !== "string") return false;
  const inputHash = await hashPassword(inputPassword);

  // If stored credential exists in config
  if (storedHashOrPlain && typeof storedHashOrPlain === "string" && storedHashOrPlain.trim().length > 0) {
    const trimmedStored = storedHashOrPlain.trim();
    // If stored is SHA-256 hash (64 hex characters)
    if (trimmedStored.length === 64 && /^[0-9a-fA-F]+$/.test(trimmedStored)) {
      return inputHash.toLowerCase() === trimmedStored.toLowerCase();
    }
    // If stored is legacy plain text (backward compatibility for existing databases)
    return inputPassword.trim() === trimmedStored;
  }

  // Fallback to default hash ONLY if no stored password exists at all
  return inputHash === DEFAULT_ADMIN_HASH;
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
    if (stored.lockoutUntil && stored.lockoutUntil > now) {
      return {
        isLocked: true,
        remainingSeconds: Math.max(1, Math.ceil((stored.lockoutUntil - now) / 1000)),
        attempts: stored.attempts || MAX_ATTEMPTS,
      };
    }
    // If lockout expired, clear
    if (stored.lockoutUntil && stored.lockoutUntil <= now) {
      localStorage.removeItem(LOCKOUT_KEY);
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
    const newAttempts = (stored.attempts || 0) + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockoutUntil = now + (LOCKOUT_DURATION_SECONDS * 1000);
      localStorage.setItem(
        LOCKOUT_KEY,
        JSON.stringify({ attempts: newAttempts, lockoutUntil })
      );
      return { isLocked: true, remainingSeconds: LOCKOUT_DURATION_SECONDS, attempts: newAttempts };
    }

    localStorage.setItem(
      LOCKOUT_KEY,
      JSON.stringify({ attempts: newAttempts, lockoutUntil: null })
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
