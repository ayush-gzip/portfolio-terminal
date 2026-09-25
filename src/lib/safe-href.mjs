/** Allow explicit web/email URLs and local paths; reject browser URL-normalization tricks. */
export function safeHref(url) {
  if (typeof url !== "string") return "#";
  const u = url.trim();
  if (/[\\\u0000-\u0020\u007f]/.test(u) || u.startsWith("//")) return "#";
  return /^(https?:\/\/|mailto:|\/(?!\/)|#|\.)/i.test(u) ? u : "#";
}
