import { PromotionPreview } from "@/components/promotions/PromotionPreview";

export const metadata = {
  title: "혜택 · 이벤트 미리보기",
  robots: { index: false, follow: false },
};

export default async function PromotionPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PromotionPreview id={id} />;
}
