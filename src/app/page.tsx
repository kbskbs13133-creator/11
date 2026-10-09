import { redirect } from "next/navigation";
// 미들웨어에서 역할별로 리다이렉트하지만, 안전장치로 남겨둠
export default function Home() {
  redirect("/login");
}
