export function getSiteUrl(required = process.env.NODE_ENV === "production") {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value && !required) return "http://localhost:3000";
  let url;
  try { url = new URL(value); } catch {
    throw new Error("Set NEXT_PUBLIC_SITE_URL to the site's full HTTPS origin before building");
  }
  if (!(required ? url.protocol === "https:" : ["https:", "http:"].includes(url.protocol)) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTPS origin without credentials, a path, query, or fragment");
  }
  return url.origin;
}
