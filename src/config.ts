// Central place for values shared across the extension.
export const SERVER_URL = 'https://git-together-server.onrender.com';

// Render's free tier spins the server down after inactivity, so the first
// request after a while can take 30-50s to wake it back up.
export const REQUEST_TIMEOUT_MS = 30000;

// Firebase Realtime Database keys can't contain '.', '#', '$', '[', ']', '/'.
export const INVALID_USERNAME_CHARS = /[.#$[\]/]/g;
export const MAX_USERNAME_LENGTH = 40;
export const MAX_ROOM_LENGTH = 40;
export const MAX_PASSCODE_LENGTH = 64;
export const PASSCODE_SECRET_KEY = 'git-together-room-passcode';

export function sanitizeUsername(raw: string): string {
    return raw.trim().replace(INVALID_USERNAME_CHARS, '_').slice(0, MAX_USERNAME_LENGTH);
}

export function sanitizeRoom(raw: string): string {
    // Lowercased so "Global", "global " and "global" all land in the same room.
    return raw.trim().toLowerCase().replace(INVALID_USERNAME_CHARS, '_').slice(0, MAX_ROOM_LENGTH) || 'global';
}

export function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
