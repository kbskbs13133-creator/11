import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { ApiError } from "./api";

/** 서버 컴포넌트용: 로그인 필수 (USER 전용 페이지) */
export async function requireUserPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "USER") redirect("/admin");
  return session.user;
}

/** 서버 컴포넌트용: ADMIN 필수 */
export async function requireAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/home");
  return session.user;
}

/** API 라우트용 (미들웨어와 별개로 핸들러에서도 이중 검증) */
export async function requireUserApi() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new ApiError(401, "로그인이 필요합니다.");
  if (session.user.role !== "USER") throw new ApiError(403, "일반 회원 전용 기능입니다.");
  return session.user;
}

export async function requireAdminApi() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new ApiError(401, "로그인이 필요합니다.");
  if (session.user.role !== "ADMIN") throw new ApiError(403, "관리자 권한이 필요합니다.");
  return session.user;
}
