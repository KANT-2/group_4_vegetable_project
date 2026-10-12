import Link from "next/link";

// 없는 채소 주소로 들어왔을 때
export default function VegetableNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="text-xl font-bold text-stone-900">
        채소 정보를 찾을 수 없어요
      </h1>
      <p className="text-sm text-stone-500">
        주소가 잘못되었거나 아직 등록되지 않은 채소예요.
      </p>
      <Link
        href="/products"
        className="mt-2 inline-flex h-12 items-center rounded-xl bg-green-800 px-5 font-semibold text-white"
      >
        상품 목록으로
      </Link>
    </main>
  );
}
