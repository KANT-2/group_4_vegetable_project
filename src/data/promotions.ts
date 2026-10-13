export interface Promotion {
  slug: string;
  label: string;
  title: string;
  description: string;
  image: string;
  kind: "coupon" | "delivery" | "experience";
  benefit: string;
  benefitLabel: string;
  facts: [string, string][];
  steps: [string, string][];
  notes: string[];
  productHref: string;
  productLabel: string;
  vegetables?: string[];
}

// 운영 조건은 2026-10-13 사용자 요청으로 정한 기획안입니다.
// 쿠폰 발급/RPC 할인과 체험 예약은 별도 구현 전까지 활성화하지 않습니다.
export const promotions: Promotion[] = [
  {
    slug: "openrun-coupon",
    label: "오픈런 쿠폰",
    kind: "coupon",
    title: "아침 장보기, 조금 더 가볍게",
    description:
      "오늘 먹을 채소를 고르는 시간. 알뜰한 아침을 위한 작은 혜택을 준비했어요.",
    image: "/images/home-banners/01-openrun.png",
    benefit: "2,000원",
    benefitLabel: "아침 장보기 할인",
    facts: [
      ["최소 주문금액", "상품 금액 20,000원 이상"],
      ["발급 시간", "매일 오전 7시–11시"],
      ["사용 기한", "발급 당일 오후 11시 59분까지"],
      ["발급 대상", "로그인 회원 · 하루 1회"],
    ],
    steps: [
      ["아침에 만나요", "오전 7시부터 11시 사이에 혜택을 확인해요."],
      ["오늘의 채소를 골라요", "판매 중인 농산물을 20,000원 이상 담아요."],
      ["당일 장보기를 마쳐요", "발급 당일 사용할 수 있는 아침 혜택이에요."],
    ],
    notes: [
      "쿠폰 운영 기간: 2026.10.13–2026.11.30",
      "배송비는 최소 주문금액에 포함되지 않아요.",
      "한 주문에 쿠폰 한 장만 사용할 수 있고 다른 주문 쿠폰과 중복되지 않아요.",
    ],
    productHref: "/products?collection=bigsale",
    productLabel: "오늘의 특가 상품 보기",
  },
  {
    slug: "first-box",
    label: "첫 구매 혜택",
    kind: "coupon",
    title: "첫 만남에는, 더 반가운 혜택",
    description:
      "모양은 달라도 맛은 그대로. 처음 만나는 못난이 채소로 식탁을 채워보세요.",
    image: "/images/home-banners/02-firstbox.png",
    benefit: "10%",
    benefitLabel: "첫 주문 할인 · 최대 5,000원",
    facts: [
      ["최소 주문금액", "상품 금액 30,000원 이상"],
      ["할인 한도", "최대 5,000원"],
      ["발급 대상", "구매 이력이 없는 회원 · 1회"],
      ["사용 기한", "발급일로부터 7일"],
    ],
    steps: [
      [
        "못난이마켓과 첫 인사",
        "구매 이력이 없는 회원을 위한 첫 주문 혜택이에요.",
      ],
      ["먹을 만큼 담아요", "소포장 채소와 제철 농산물로 첫 장보기를 시작해요."],
      ["첫 식탁을 채워요", "첫 주문에서 최대 5,000원을 아낄 수 있어요."],
    ],
    notes: [
      "쿠폰 운영 기간: 2026.10.13–2026.11.30",
      "상품 금액 기준이며 배송비는 할인 대상에서 제외돼요.",
      "다른 주문 쿠폰과 중복 사용할 수 없어요.",
    ],
    productHref: "/products?collection=single",
    productLabel: "첫 장보기 추천 상품 보기",
  },
  {
    slug: "fresh-delivery",
    label: "배송 안내",
    kind: "delivery",
    title: "15시 전에 주문하면 오늘 자정 전 도착!",
    description:
      "수도권 당일 배송의 주문 시간과 대상 지역, 배송비를 확인해 주세요.",
    image: "/images/home-banners/03-freshdelivery-v2.png",
    benefit: "오늘 자정 전",
    benefitLabel: "15시 전 주문 시 도착 · 수도권 대상 지역",
    facts: [
      ["주문 시간", "15시 전 주문"],
      ["도착 시간", "오늘 자정 전"],
      ["대상 지역", "수도권 · 상세 배송 가능 지역 확인 필요"],
      ["기본 배송비", "3,500원"],
      ["무료배송 기준", "상품 금액 20,000원 이상"],
      ["배송지", "주문할 때 주소와 연락처 확인"],
      ["주소 관리", "마이페이지에서 기본 배송지 변경"],
    ],
    steps: [
      [
        "제철 채소를 골라요",
        "상품별 판매 단위와 상태를 확인하고 장바구니에 담아요.",
      ],
      [
        "대상 지역을 확인해요",
        "받을 곳이 수도권 배송 대상 지역인지 확인하고 주소와 연락처를 입력해 주세요.",
      ],
      [
        "15시 전에 주문해요",
        "오늘 자정 전 도착 안내를 확인하고, 주문 상세에서 배송지와 배송비를 다시 확인해 주세요.",
      ],
    ],
    notes: [
      "무료배송 여부는 주문 화면의 상품 금액으로 계산해요.",
      "당일 배송 대상은 수도권 내 배송 가능 지역이며, 상세 지역과 실제 운영 일정은 별도 확인이 필요해요.",
      "배송지를 변경해도 이미 접수한 주문의 배송지는 자동으로 바뀌지 않아요.",
    ],
    productHref: "/products?collection=seasonal",
    productLabel: "제철 농산물 보러 가기",
  },
  {
    slug: "kimjang-coupon",
    label: "김장 쿠폰",
    kind: "coupon",
    title: "김장 준비는 넉넉하게, 부담은 가볍게",
    description:
      "아삭한 배추부터 시원한 무까지. 우리 집 김장을 위한 제철 재료를 함께 골라보세요.",
    image: "/images/home-banners/04-kimjangcoupon.png",
    benefit: "15%",
    benefitLabel: "김장 재료 할인 · 최대 7,000원",
    facts: [
      ["최소 주문금액", "대상 상품 금액 40,000원 이상"],
      ["할인 한도", "최대 7,000원"],
      ["대상 품목", "배추 · 무 · 양파"],
      ["사용 기한", "2026년 11월 30일까지 · 회원당 1회"],
    ],
    steps: [
      ["김장 재료를 골라요", "배추, 무, 양파 중 필요한 재료를 담아요."],
      [
        "넉넉하게 준비해요",
        "대상 재료를 40,000원 이상 담으면 혜택 조건에 맞아요.",
      ],
      [
        "함께 담그면 더 좋아요",
        "김장체험 안내에서 가족과 함께하는 하루도 확인해 보세요.",
      ],
    ],
    notes: [
      "쿠폰 운영 기간: 2026.10.13–2026.11.30",
      "대상 품목 외 상품과 배송비는 할인 계산에서 제외돼요.",
      "다른 주문 쿠폰과 중복 사용할 수 없어요.",
    ],
    productHref: "/products?q=배추",
    productLabel: "김장 재료 더 보기",
    vegetables: ["napa-cabbage", "radish", "onion"],
  },
  {
    slug: "family-kimjang",
    label: "가족 김장체험",
    kind: "experience",
    title: "함께 버무리고, 함께 웃는 하루",
    description:
      "밭에서 만난 채소가 우리 집 김치가 되는 시간. 아이와 함께하는 첫 김장을 준비하고 있어요.",
    image: "/images/home-banners/05-familykimjang.png",
    benefit: "35,000원",
    benefitLabel: "가족 1팀 · 보호자 1명 + 어린이 1명",
    facts: [
      ["예정 일정", "2026.11.07 · 11.14 · 11.21 (토)"],
      ["진행 시간", "오전 10시–오후 12시 · 2시간"],
      ["체험 구성", "재료 · 앞치마 · 완성 김치 2kg"],
      ["모집 계획", "회차당 10팀 · 만 6세 이상 어린이"],
    ],
    steps: [
      [
        "10:00 · 밭과 인사해요",
        "못난이 농산물이 자라는 과정과 선별 이야기를 들어요.",
      ],
      [
        "10:30 · 함께 버무려요",
        "준비한 재료로 보호자와 아이가 함께 김치를 만들어요.",
      ],
      [
        "11:40 · 식탁으로 가져가요",
        "완성한 김치를 포장하고 보관 방법을 알아봐요.",
      ],
    ],
    notes: [
      "체험 일정과 참가비는 기획안이며 현재 예약을 받지 않아요.",
      "진행 농가와 장소는 확정 후 안내해요. 결제나 예약 확정 문자는 발송되지 않아요.",
      "계획된 취소 기준: 7일 전 전액, 3–6일 전 50%, 2일 전부터 환불 불가. 운영 확정 시 다시 안내해요.",
      "김치 재료에 알레르기가 있다면 접수 시작 후 참여 전에 확인해 주세요.",
    ],
    productHref: "/products?q=배추",
    productLabel: "집에서 준비할 김장 재료 보기",
    vegetables: ["napa-cabbage", "radish", "onion"],
  },
];
