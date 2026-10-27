// 화면 곳곳에서 쓰는 작은 아이콘 (장식용이라 스크린리더에는 읽히지 않아요)

import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const ClockIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const UsersIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.2.7 3.5 2.6 3.5 5.6" />
  </Icon>
);

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const MenuIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const ArrowLeftIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const ArrowRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const LeafIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
    <path d="M5 19c3-4 6-6 10-8" />
  </Icon>
);

export const CartIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M2 3h3l3 13h11l3-9H6" />
    <circle cx="9" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
  </Icon>
);

// 찜 하트. 꽉 찬 하트는 fill="currentColor"로 써요.
export const HeartIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
  </Icon>
);

export const TagIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3 12V4h8l10 10-8 8z" />
    <circle cx="7.5" cy="8.5" r="1.5" />
  </Icon>
);

export const BoxIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </Icon>
);

export const UserIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </Icon>
);

export const BagIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M5 8h14l-1 13H6z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Icon>
);

export const ChevronDownIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

// 헤더 메뉴 아이콘 (2026-10-26 시안): 레시피·농가 이야기·체험 예약·혜택과 이야기
export const ChefHatIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon strokeWidth="1.8" {...props}>
    <path d="M7 14.5V20h10v-5.5" />
    <path d="M7 14.5a4 4 0 0 1-1.6-7.7A4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 6.6 2.8A4 4 0 0 1 17 14.5z" />
    <path d="M7 17h10" />
  </Icon>
);

export const BarnIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon strokeWidth="1.8" {...props}>
    <path d="M3 10 12 4l9 6" />
    <path d="M5 9v11h14V9" />
    <path d="M9 20v-6h6v6" />
    <path d="m9 14 6 6M15 14l-6 6" />
    <path d="M10.5 9.5h3" />
  </Icon>
);

export const CalendarSproutIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon strokeWidth="1.8" {...props}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M12 18v-4.5" />
    <path d="M12 14.5c0-1.7 1.2-2.6 3-2.6 0 1.7-1.2 2.6-3 2.6zM12 15.5c0-1.4-1-2.2-2.5-2.2 0 1.4 1 2.2 2.5 2.2z" />
  </Icon>
);

export const GiftIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon strokeWidth="1.8" {...props}>
    <rect x="3.5" y="8" width="17" height="4" rx="1" />
    <path d="M5 12v8h14v-8M12 8v12" />
    <path d="M12 8c-1.5-3.5-5-3.5-5-1.2C7 8 9 8 12 8zM12 8c1.5-3.5 5-3.5 5-1.2C17 8 15 8 12 8z" />
  </Icon>
);

// 조건 초기화 (되돌리기 화살표)
export const ResetIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </Icon>
);
