import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "로그인 | 포인트 예치 플랫폼" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
