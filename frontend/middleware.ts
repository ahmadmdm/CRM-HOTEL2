import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SECRET_KEY ?? process.env.NEXTAUTH_SECRET ?? "fallback-secret-change-in-production"
);

// Routes accessible without authentication
const PUBLIC_ROUTES = ["/login", "/api/auth", "/api/backend"];
const DASHBOARD_ROLES = ["super_admin", "sub_admin", "operations"];

// Role-based route access map
const ROLE_ROUTES: Record<string, string[]> = {
  "/users": ["super_admin"],
  "/units": ["super_admin", "sub_admin", "operations"],
  "/bookings": ["super_admin", "sub_admin", "operations"],
  "/customers": ["super_admin", "sub_admin", "operations"],
  "/operations": ["super_admin", "sub_admin", "operations", "maintenance"],
  "/housekeeping": ["super_admin", "sub_admin", "housekeeping"],
  "/maintenance": ["super_admin", "sub_admin", "maintenance"],
  "/finance": ["super_admin", "financial"],
};

function redirectForRole(userRole: string, request: NextRequest) {
  if (userRole === "housekeeping") {
    return NextResponse.redirect(new URL("/housekeeping", request.url));
  }
  if (userRole === "maintenance") {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }
  if (userRole === "financial") {
    return NextResponse.redirect(new URL("/finance", request.url));
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Get access token from sessionStorage is not available in middleware
  // Use cookie-based approach for SSR token validation
  const token =
    request.cookies.get("crm_access_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Validate the JWT token
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });

    const userRole = payload.role as string;

    if (pathname === "/" && !DASHBOARD_ROLES.includes(userRole)) {
      return redirectForRole(userRole, request);
    }

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
        return redirectForRole(userRole, request);
      }
    }

    // Pass user info to headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.sub as string);
    requestHeaders.set("x-user-role", userRole);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Token invalid or expired
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("crm_access_token");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api/health).*)",
  ],
};
