/**
 * A `Content-Disposition` that downloads the response as `fileName`. Browsers
 * that understand RFC 5987 use the UTF-8 `filename*`; older ones fall back to
 * an ASCII `filename` with accents stripped and anything unsafe replaced.
 */
export function attachmentDisposition(fileName: string): string {
  return `attachment; filename="${asciiFallback(fileName)}"; filename*=UTF-8''${encodeRfc5987(fileName)}`;
}

function asciiFallback(fileName: string): string {
  return fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]|["\\]/g, "_");
}

/** Percent-encodes everything outside RFC 5987's `attr-char`. */
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
