// 체험 예약 화면용 타입과 표시 함수. 서버·브라우저 어디서든 쓸 수 있어요.

export type Experience = {
  id: string;
  title: string;
  description: string;
  farm_name: string;
  region: string;
  fee: number;
  image_path: string | null;
};

export type Session = {
  id: string;
  experience_id: string;
  starts_at: string;
  capacity: number;
  remaining: number;
  status: "open" | "closed";
  // 서버 조회 함수가 계산해서 내려주는 값: 이미 시작한 회차인지
  started?: boolean;
};

export type ExperienceDetail = Experience & { sessions: Session[] };

export type Reservation = {
  id: string;
  session_id: string;
  user_id: string;
  headcount: number;
  status: "reserved" | "cancelled";
  created_at: string | null;
  cancelled_at: string | null;
  experience_id: string;
  experience_title: string;
  starts_at: string;
};

export type Page<T> = { items: T[]; total: number; page: number; size: number };

// 회차 시각을 한국 시간으로 보여줘요. 예: 11월 14일(토) 오전 10:00
export function formatSessionTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
