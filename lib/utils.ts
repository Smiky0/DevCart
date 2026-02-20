/**
 * Convert an R2 storage key to a full public URL.
 * Falls back to the key as-is if NEXT_PUBLIC_IMAGE_HOST is not set.
 */
export function getImageUrl(storageKey: string): string {
    const host = process.env.NEXT_PUBLIC_IMAGE_HOST;
    if (!host) return storageKey;
    return `${host}/${storageKey}`;
}
