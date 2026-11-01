export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/connexion" ||
    pathname.startsWith("/connexion/") ||
    pathname === "/session-expiree" ||
    pathname === "/acces-refuse" ||
    pathname === "/favicon.ico"
  );
}
