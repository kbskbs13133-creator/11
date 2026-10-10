import CryptoAdmin from "./CryptoAdmin";
import { pageTitle } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("코인 입금 관리");

export default function AdminCryptoPage() {
  return <CryptoAdmin />;
}
