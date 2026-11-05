/**
 * Room Code Generator & Validator
 * Uses an unambiguous alphabet: uppercase A-Z (excluding 'I' and 'O') and digits 2-9 (excluding '0' and '1').
 * Total alphabet length = 32. 32^6 = 1,073,741,824 possible unguessable 6-character room codes.
 */

export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 6;

/**
 * Generates a random 6-character room code from the unambiguous alphabet.
 */
export function generateRoomCode(): string {
  const chars: string[] = [];
  const alphabetLength = ROOM_CODE_ALPHABET.length;

  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    // Generate secure random index
    const randomIndex = Math.floor(Math.random() * alphabetLength);
    chars.push(ROOM_CODE_ALPHABET[randomIndex]);
  }

  return chars.join('');
}

/**
 * Validates whether a given string is a valid room code.
 */
export function isValidRoomCode(code: unknown): boolean {
  if (typeof code !== 'string') return false;
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length !== ROOM_CODE_LENGTH) return false;

  for (let i = 0; i < trimmed.length; i++) {
    if (!ROOM_CODE_ALPHABET.includes(trimmed[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Normalizes input by trimming and converting to uppercase.
 */
export function normalizeRoomCode(code: string): string {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

