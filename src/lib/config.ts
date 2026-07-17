export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://schoolari.com";
  }
  return "http://localhost:3000";
}

export function getMemberUrl(): string {
  if (process.env.NEXT_PUBLIC_MEMBER_URL) {
    return process.env.NEXT_PUBLIC_MEMBER_URL;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://members.schoolari.com";
  }
  return "http://members.localhost:3000";
}

export function getAdminUrl(): string {
  if (process.env.NEXT_PUBLIC_ADMIN_URL) {
    return process.env.NEXT_PUBLIC_ADMIN_URL;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://admin.schoolari.com";
  }
  return "http://admin.localhost:3000";
}
