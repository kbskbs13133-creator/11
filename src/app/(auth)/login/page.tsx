import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("로그인");

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
