/**
 * Convert an R2 storage key to a full public URL.
 * Falls back to the key as-is if NEXT_PUBLIC_IMAGE_HOST is not set.
 */
export function getImageUrl(storageKey: string): string {
    const host = process.env.NEXT_PUBLIC_IMAGE_HOST;
    if (!host) return storageKey;
    return `${host}/${storageKey}`;
}

/**
 * Format a price stored as integer cents as a dollar amount string,
 * e.g. 1999 -> "19.99".
 */
export function formatPrice(cents: number): string {
    return (cents / 100).toFixed(2);
}
