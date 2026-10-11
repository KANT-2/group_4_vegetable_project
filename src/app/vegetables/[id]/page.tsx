import Link from "next/link";
import { SafeImage } from "@/components/common/SafeImage";
import { notFound } from "next/navigation";
import ProductCard from "@/components/products/ProductCard";
import { getProductsByVegetable } from "@/services/products";
import { getVegetableById } from "@/services/vegetables";
import { VEGETABLE_CATEGORY_LABELS } from "@/types/vegetable";

// 브라우저 탭 제목: "당근 | 못난이마켓"
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const vegetable = await getVegetableById((await params).id);
  return { title: vegetable?.name ?? "채소 정보를 찾을 수 없어요" };
}

// 주소: /vegetables/carrot → id = "carrot"
export default async function VegetablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vegetable, products] = await Promise.all([
    getVegetableById(id),
    getProductsByVegetable(id),
  ]);
  if (!vegetable) notFound();

  return (
    <div className="container-page pb-12 pt-4">
      <Link
        href="/products"
        className="inline-flex h-12 items-center text-sm text-ink-muted hover:text-ink"
      >
        ← 상품 목록
      </Link>

      {/* 채소 소개 */}
      <section className="flex flex-col gap-5 rounded-card bg-surface p-5 ring-1 ring-line sm:flex-row sm:items-center sm:p-6">
        {vegetable.imageUrl && (
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-card bg-sand sm:w-48">
            <SafeImage
              src={vegetable.imageUrl}
              alt={vegetable.name}
              className="absolute inset-0 h-full w-full object-cover"
              priority
            />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-brand-dark">
            {VEGETABLE_CATEGORY_LABELS[vegetable.category]}
            {vegetable.season && (
              <span className="font-normal text-ink-muted">
                {" "}
                · 제철 {vegetable.season}
              </span>
            )}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
            {vegetable.name}
          </h1>
          <p className="mt-2 text-ink-muted">{vegetable.description}</p>
        </div>
      </section>

      {/* 보관법·손질법 */}
      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card bg-surface p-5 ring-1 ring-line">
          <h2 className="font-bold text-ink">보관법</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {vegetable.storageGuide ?? "보관법 정보가 아직 없어요."}
          </p>
        </div>
        <div className="rounded-card bg-surface p-5 ring-1 ring-line">
          <h2 className="font-bold text-ink">손질법</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {vegetable.prepGuide ?? "손질법 정보가 아직 없어요."}
          </p>
        </div>
      </section>

      {/* 이 채소로 파는 상품 (TODO: A의 관련 레시피 연결) */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-ink">
          {vegetable.name} 못난이 상품
        </h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="rounded-card bg-surface p-6 text-center text-sm text-ink-muted ring-1 ring-line">
            지금 판매 중인 {vegetable.name} 상품이 없어요.
          </p>
        )}
      </section>
    </div>
  );
}
