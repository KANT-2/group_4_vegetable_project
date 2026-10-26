import { FarmCustomerPreview } from "@/components/common/FarmCustomerPreview";

export const metadata = {
  title: "농가 고객 화면 미리보기",
  robots: { index: false, follow: false },
};
export default async function FarmPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <FarmCustomerPreview id={(await params).id} />;
}
