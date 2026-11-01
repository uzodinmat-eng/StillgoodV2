// Store front photos arrive as browser-compressed JPEG/PNG/WebP data URLs.
// Server actions reject bodies over 1MB, so keep the encoded size well under that.
const MAX_STORE_IMAGE_CHARS = 900_000;
const STORE_IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** Returns an error message, or null when the value is an acceptable store photo. */
export function validateStoreImage(value: string): string | null {
  if (!STORE_IMAGE_PATTERN.test(value)) {
    return "Store photo must be a JPG, PNG, or WebP image.";
  }
  if (value.length > MAX_STORE_IMAGE_CHARS) {
    return "That store photo is too large. Try a smaller picture.";
  }
  return null;
}
