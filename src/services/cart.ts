import "server-only";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CartLine, WishlistLine } from "@/lib/cart";
import { toImageSrc } from "./catalog-source";
import { getProductImages } from "@/lib/product-gallery";
import { getCustomerDemo } from "@/lib/customer-demo";
import { readDemoWishlist } from "@/lib/customer-demo-wishlist";
import { getProductById } from "./products";
import { readDemoCart } from "@/lib/customer-demo-cart";
import { getCartMode } from "@/lib/cart-mode";
import { apiGetCart } from "@/lib/cart-api";
import { readGuestCart } from "@/lib/guest-cart";

const PRODUCT_FIELDS =
  "products(id, name, unit, price, original_price, image_path, is_active)";

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  price: number;
  original_price: number;
  image_path: string | null;
  is_active: boolean;
} | null;

// 판매 종료 상품은 RLS로 읽히지 않아 null 이 돼요.
function toProductInfo(productId: string, product: ProductRow) {
  if (!product || !product.is_active)
    return {
      available: false,
      name: "판매가 끝난 상품",
      unit: "",
      price: 0,
      originalPrice: 0,
      imageUrl: undefined,
    };
  return {
    available: true,
    name: product.name,
    unit: product.unit,
    price: product.price,
    originalPrice: product.original_price,
    imageUrl: getProductImages({
      id: productId,
      imageUrl: toImageSrc(product.image_path),
    })[0],
  };
}

// 장바구니 한 줄을 화면용으로 만들어요. 상품 정보는 상품 데이터(B)에서 읽고, 판매 종료·삭제된 상품은 available=false 예요.
async function linesFromCatalog(
  items: { productId: string; quantity: number }[],
) {
  return Promise.all(
    items.map(async ({ productId, quantity }) => {
      const product = await getProductById(productId);
      return {
        productId,
        quantity,
        // 재고가 0인 상품(품절)은 구매할 수 없어요.
        available: Boolean(product && product.stock !== 0),
        name: product?.name ?? "판매가 끝난 상품",
        unit: product?.unit ?? "",
        price: product?.price ?? 0,
        originalPrice: product?.originalPrice ?? 0,
        imageUrl: product?.imageUrl,
      };
    }),
  );
}

// userId 는 로그인 사용자의 ID 예요. 비회원은 isGuest=true 이고 계정 확인(AccountGuard)을 거치지 않아요.
export async function getCart(): Promise<{
  userId: string;
  isGuest: boolean;
  // 로그인했는데 합치지 못한 비회원 장바구니 줄 수(0이면 합칠 것이 없어요).
  guestPending: number;
  lines: CartLine[];
}> {
  const mode = await getCartMode();
  if (mode.kind === "demo") {
    return {
      userId: "customer-demo-qwer",
      isGuest: false,
      guestPending: 0,
      lines: await linesFromCatalog(readDemoCart()),
    };
  }
  if (mode.kind === "guest") {
    return {
      userId: "guest",
      isGuest: true,
      guestPending: 0,
      lines: await linesFromCatalog(await readGuestCart()),
    };
  }
  if (mode.kind === "fastapi") {
    // 수량·단가·판매 여부는 FastAPI(서버 기준)를 따르고, 정가·사진은 상품 데이터에서 보충해요.
    const cart = await apiGetCart(mode.token);
    const lines = await Promise.all(
      [...cart.items].reverse().map(async (line) => {
        const catalog = await getProductById(line.product_id);
        // FastAPI 는 판매 여부(is_active)만 알아서, 재고가 0인 품절 상품은 화면 쪽 상품 데이터로 함께 판단해요.
        const available = line.is_active && catalog?.stock !== 0;
        return {
          productId: line.product_id,
          quantity: line.quantity,
          available,
          name: available ? line.name : "판매가 끝난 상품",
          unit: available ? line.unit : "",
          price: available ? line.unit_price : 0,
          originalPrice: available
            ? (catalog?.originalPrice ?? line.unit_price)
            : 0,
          imageUrl: available
            ? (catalog?.imageUrl ?? toImageSrc(line.image_path))
            : undefined,
        };
      }),
    );
    const guestPending = (await readGuestCart()).length;
    return { userId: mode.userId, isGuest: false, guestPending, lines };
  }
  const user = await requireUser("/cart");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select(`product_id, quantity, ${PRODUCT_FIELDS}`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("장바구니를 불러오지 못했어요.");
  return {
    userId: user.id,
    isGuest: false,
    guestPending: 0,
    lines: data.map((row) => ({
      productId: row.product_id,
      quantity: row.quantity,
      ...toProductInfo(row.product_id, row.products as ProductRow),
    })),
  };
}

export async function getWishlist(): Promise<{
  userId: string;
  lines: WishlistLine[];
}> {
  if (await getCustomerDemo()) {
    const lines = await Promise.all(
      readDemoWishlist().map(async (productId) => {
        const product = await getProductById(productId);
        return {
          productId,
          available: Boolean(product),
          name: product?.name ?? "판매가 끝난 상품",
          unit: product?.unit ?? "",
          price: product?.price ?? 0,
          originalPrice: product?.originalPrice ?? 0,
          imageUrl: product?.imageUrl,
        };
      }),
    );
    return { userId: "customer-demo-qwer", lines };
  }
  const user = await requireUser("/cart?tab=wishlist");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlist_items")
    .select(`product_id, ${PRODUCT_FIELDS}`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("찜 목록을 불러오지 못했어요.");
  return {
    userId: user.id,
    lines: data.map((row) => ({
      productId: row.product_id,
      ...toProductInfo(row.product_id, row.products as ProductRow),
    })),
  };
}

// 상품 상세의 버튼 초기 상태. 로그인 전이거나 조회에 실패하면 "찜 안 함"으로 보여요.
export async function getSavedState(productId: string) {
  try {
    if (await getCustomerDemo())
      return { loggedIn: true, wished: readDemoWishlist().includes(productId) };
    const user = await getCurrentUser();
    if (!user) return { loggedIn: false, wished: false };
    const supabase = await createClient();
    const { data } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();
    return { loggedIn: true, wished: !!data };
  } catch {
    return { loggedIn: false, wished: false };
  }
}
