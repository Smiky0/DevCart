import { createHmac, timingSafeEqual } from "crypto";

const VERSION = "v1";

/**
 * Opaque, tamper-proof pagination cursors.
 *
 * Format: v1.<base64url(payload)>.<hmac-sha256 signature>
 * The signature covers the version + payload, so any modification
 * (different id, timestamp, or structure) invalidates the cursor.
 */
export interface CursorPayload {
    /** updatedAt of the last row on the previous page (ISO string) */
    u: string;
    /** id of the last row on the previous page (tiebreaker) */
    i: string;
}

// cuids are ~25 chars; cap to reject absurd payloads early
const MAX_ID_LENGTH = 64;

function getSecret(): string {
    const secret = process.env.CURSOR_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
    if (!secret) {
        throw new Error(
            "Missing CURSOR_SECRET (or NEXTAUTH_SECRET fallback) for cursor signing.",
        );
    }
    return secret;
}

function sign(data: string): string {
    return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function encodeCursor(payload: CursorPayload): string {
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    return `${VERSION}.${body}.${sign(`${VERSION}.${body}`)}`;
}

/**
 * Verify + decode a cursor. Returns null when anything is off:
 * wrong version, bad signature (tamper), malformed payload.
 */
export function decodeCursor(cursor: unknown): CursorPayload | null {
    if (typeof cursor !== "string") return null;
    const parts = cursor.split(".");
    if (parts.length !== 3) return null;
    const [version, body, signature] = parts;
    if (version !== VERSION || !body || !signature) return null;

    // constant-time comparison so response timing can't leak the signature
    const expected = Buffer.from(sign(`${version}.${body}`));
    const provided = Buffer.from(signature);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
        return null;
    }

    try {
        const raw = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<
            string,
            unknown
        >;
        if (typeof raw.u !== "string" || isNaN(Date.parse(raw.u))) return null;
        if (
            typeof raw.i !== "string" ||
            raw.i.length === 0 ||
            raw.i.length > MAX_ID_LENGTH
        ) {
            return null;
        }
        return { u: raw.u, i: raw.i };
    } catch {
        return null;
    }
}
