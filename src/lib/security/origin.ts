function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isAllowedOrigin(request: Request) {
  const requestOrigin = normalizeOrigin(request.headers.get("origin"));

  if (!requestOrigin) {
    return true;
  }

  const allowedOrigins = new Set<string>();
  const requestUrlOrigin = normalizeOrigin(request.url);
  const siteUrlOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? null);
  const vercelUrlOrigin = normalizeOrigin(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  );

  [requestUrlOrigin, siteUrlOrigin, vercelUrlOrigin].forEach((origin) => {
    if (origin) {
      allowedOrigins.add(origin);
    }
  });

  return allowedOrigins.has(requestOrigin);
}
