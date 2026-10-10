import { LOCALE_COOKIE, normalizeLocale, translateMessage } from "@/lib/i18n";

function currentLocale() {
  if (typeof document === "undefined") return normalizeLocale(null);
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return normalizeLocale(m?.[1]);
}

// 클라이언트 fetch 헬퍼: 에러 응답이면 서버 메시지(현재 언어로 변환)로 throw
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `요청 실패 (${res.status})`;
    throw new Error(translateMessage(currentLocale(), msg));
  }
  return data as T;
}
