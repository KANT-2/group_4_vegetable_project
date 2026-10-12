import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/products/ProductCard";
import { getProductsByVegetable } from "@/services/products";
import { getVegetableById } from "@/services/vegetables";
import { VEGETABLE_CATEGORY_LABELS } from "@/types/vegetable";

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
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-12 pt-4 sm:px-6">
      <Link
        href="/products"
        className="inline-flex h-12 items-center text-sm text-stone-500 hover:text-stone-900"
      >
        ← 상품 목록
      </Link>

      {/* 채소 소개 */}
      <section className="flex flex-col gap-5 rounded-[20px] bg-white p-5 ring-1 ring-stone-200 sm:flex-row sm:items-center sm:p-6">
        {vegetable.imageUrl && (
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-[20px] bg-amber-50 sm:w-48">
            <Image
              src={vegetable.imageUrl}
              alt={vegetable.name}
              fill
              sizes="(min-width: 640px) 12rem, 100vw"
              className="object-cover"
              preload
            />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-green-800">
            {VEGETABLE_CATEGORY_LABELS[vegetable.category]}
            {vegetable.season && (
              <span className="font-normal text-stone-500">
                {" "}
                · 제철 {vegetable.season}
              </span>
            )}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900 sm:text-3xl">
            {vegetable.name}
          </h1>
          <p className="mt-2 text-stone-600">{vegetable.description}</p>
        </div>
      </section>

      {/* 보관법·손질법 */}
      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[20px] bg-white p-5 ring-1 ring-stone-200">
          <h2 className="font-bold text-stone-900">보관법</h2>
          <p className="mt-2 text-sm text-stone-600">
            {vegetable.storageGuide ?? "보관법 정보가 아직 없어요."}
          </p>
        </div>
        <div className="rounded-[20px] bg-white p-5 ring-1 ring-stone-200">
          <h2 className="font-bold text-stone-900">손질법</h2>
          <p className="mt-2 text-sm text-stone-600">
            {vegetable.prepGuide ?? "손질법 정보가 아직 없어요."}
          </p>
        </div>
      </section>

      {/* 이 채소로 파는 상품 (TODO: A의 관련 레시피 연결) */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-stone-900">
          {vegetable.name} 못난이 상품
        </h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="rounded-[20px] bg-white p-6 text-center text-sm text-stone-500 ring-1 ring-stone-200">
            지금 판매 중인 {vegetable.name} 상품이 없어요.
          </p>
        )}
      </section>
    </main>
  );
}
