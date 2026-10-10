import { NextResponse, type NextRequest } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";

/**
 * 권한 분리 미들웨어
 *  - /admin/**, /api/admin/**         : ADMIN 전용
 *  - /home, /dashboard, /products, /wallet, /my-deposits, /api/deposits, /api/transactions, /api/me : USER 전용
 *  - /login, /signup                  : 로그인 상태면 역할별 홈으로 이동
 *  - /api/cron/**                     : 미들웨어 제외 (CRON_SECRET 으로 핸들러에서 검증)
 */

const USER_PAGES = ["/home", "/yield", "/dashboard", "/products", "/wallet", "/my-deposits"];
const USER_APIS = ["/api/deposits", "/api/transactions", "/api/me"];
const AUTH_PAGES = ["/login", "/signup"];

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p + "/"));

async function readToken(req: NextRequest): Promise<JWT | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  // 프록시 환경(https 종단)과 로컬(http) 모두 지원하도록 secure / non-secure 쿠키 모두 확인
  return (
    (await getToken({ req, secret, secureCookie: true })) ??
    (await getToken({ req, secret, secureCookie: false }))
  );
}

const homeFor = (role?: string) => (role === "ADMIN" ? "/admin" : "/home");

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = await readToken(req);
  const role = token?.role;
  const isApi = pathname.startsWith("/api/");

  const deny = (status: 401 | 403) => {
    if (isApi) {
      return NextResponse.json(
        { error: status === 401 ? "로그인이 필요합니다." : "접근 권한이 없습니다." },
        { status }
      );
    }
    if (status === 401) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(url);
    }
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  };

  // 로그인/회원가입: 이미 로그인되어 있으면 홈으로
  if (startsWithAny(pathname, AUTH_PAGES)) {
    if (token) return NextResponse.redirect(new URL(homeFor(role), req.url));
    return NextResponse.next();
  }

  // 루트: 로그인 상태면 역할별 홈으로, 아니면 소개(랜딩) 페이지 표시
  if (pathname === "/") {
    if (token) return NextResponse.redirect(new URL(homeFor(role), req.url));
    return NextResponse.next();
  }

  // 공개 수익 구조 페이지: 로그인한 회원은 회원용 페이지로
  if (pathname === "/strategy") {
    if (token && role === "USER") return NextResponse.redirect(new URL("/yield", req.url));
    return NextResponse.next();
  }

  // 관리자 영역
  if (startsWithAny(pathname, ["/admin", "/api/admin"])) {
    if (!token) return deny(401);
    if (role !== "ADMIN") return deny(403);
    return NextResponse.next();
  }

  // 일반 회원 영역
  if (startsWithAny(pathname, USER_PAGES) || startsWithAny(pathname, USER_APIS)) {
    if (!token) return deny(401);
    if (role !== "USER") return deny(403);
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/home/:path*",
    "/yield/:path*",
    "/strategy",
    "/dashboard/:path*",
    "/products/:path*",
    "/wallet/:path*",
    "/my-deposits/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/deposits/:path*",
    "/api/transactions/:path*",
    "/api/me/:path*",
  ],
};
