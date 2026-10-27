// 체험 상세 화면에 보여줄 자세한 안내 (소요 시간, 진행 순서, 준비물 등).
// 시연용 안내 문구예요. 체험 목록·회차·예약은 서버(DB)가 관리하고, 이 파일은 화면 설명만 담아요.

export type ExperienceContent = {
  duration: string;
  audience: string[];
  steps: { title: string; time: string; text: string }[];
  included: string[];
  bring: string[];
  notes: string[];
};

const COMMON_NOTES = [
  "참가 인원은 1~10명이에요. 한 번에 예약할 수 있는 인원도 같아요.",
  "체험 시작 24시간 전까지 [내 예약]에서 취소할 수 있어요. 그 뒤에는 취소할 수 없어요.",
  "참가비는 현장에서 안내하며 이 화면에서 결제하지 않아요.",
];

export const EXPERIENCE_CONTENT: Record<string, ExperienceContent> = {
  "apple-picking": {
    duration: "약 2시간",
    audience: [
      "아이와 함께 과수원을 걸어 보고 싶은 가족",
      "모양이 제각각인 못난이 사과가 궁금한 분",
      "직접 딴 사과를 바로 맛보고 싶은 분",
    ],
    steps: [
      {
        title: "도착 · 안내",
        time: "15분",
        text: "농가 소개와 안전 안내를 듣고 장갑과 바구니를 받아요.",
      },
      {
        title: "사과 따기",
        time: "60분",
        text: "과수원을 걸으며 마음에 드는 사과를 직접 따요. 크기와 모양이 제각각이어서 더 재미있어요.",
      },
      {
        title: "못난이 사과 이야기",
        time: "15분",
        text: "흠집이나 모양 때문에 선별에서 빠지는 이유와 맛은 그대로라는 이야기를 들어요.",
      },
      {
        title: "시식 · 마무리",
        time: "30분",
        text: "딴 사과를 함께 맛보고, 담아 갈 사과를 정리해요.",
      },
    ],
    included: ["장갑과 바구니 대여", "농가 안내와 안전 교육", "현장 시식"],
    bring: ["걷기 편한 운동화", "모자와 선크림", "마실 물"],
    notes: [
      "비가 많이 오면 일정이 바뀌거나 취소될 수 있어요. 이 경우 미리 안내해요.",
      ...COMMON_NOTES,
    ],
  },
  "carrot-harvest": {
    duration: "약 2시간 30분",
    audience: [
      "흙에서 채소를 직접 뽑아 보고 싶은 분",
      "수확한 채소로 바로 요리해 보고 싶은 분",
      "제주 구좌의 밭 풍경을 느끼고 싶은 분",
    ],
    steps: [
      {
        title: "도착 · 안내",
        time: "15분",
        text: "농원 소개와 밭에서 지킬 안전 수칙을 듣고 장갑과 도구를 받아요.",
      },
      {
        title: "당근 수확",
        time: "60분",
        text: "밭 이랑을 따라 당근을 뽑아요. 휘거나 갈라진 못난이 당근도 만나요.",
      },
      {
        title: "씻기 · 손질",
        time: "20분",
        text: "수확한 당근을 씻고 요리할 수 있게 손질해요.",
      },
      {
        title: "당근 라페 만들기",
        time: "45분",
        text: "손질한 당근을 채 썰어 양념에 버무려 당근 라페를 만들어요.",
      },
      {
        title: "시식 · 마무리",
        time: "10분",
        text: "만든 라페를 맛보고 정리해요.",
      },
    ],
    included: ["장갑과 수확 도구", "당근 라페 재료", "현장 시식"],
    bring: ["흙이 묻어도 되는 옷과 신발", "여벌 양말", "마실 물"],
    notes: [
      "밭에서 진행해서 날씨에 따라 순서가 바뀔 수 있어요.",
      ...COMMON_NOTES,
    ],
  },
  "kimjang-class": {
    duration: "약 3시간",
    audience: [
      "김장을 처음 해 보는 분",
      "가족·이웃과 함께 김장 분위기를 느끼고 싶은 분",
      "농가에서 바로 쓴 배추로 담가 보고 싶은 분",
    ],
    steps: [
      {
        title: "도착 · 위생 안내",
        time: "15분",
        text: "앞치마와 고무장갑을 받고 위생 수칙을 들어요.",
      },
      {
        title: "배추 절이기 알아보기",
        time: "25분",
        text: "배추가 어떻게 절여지는지 보고, 속을 채우기 좋은 상태를 알아요.",
      },
      {
        title: "양념 버무리기",
        time: "60분",
        text: "양념을 배춧잎 사이사이에 골고루 발라 속을 채워요.",
      },
      {
        title: "담그기 · 포장",
        time: "30분",
        text: "버무린 김치를 용기에 담아 포장해요.",
      },
      {
        title: "시식 · 마무리",
        time: "30분",
        text: "갓 버무린 김치를 맛보고 정리해요.",
      },
    ],
    included: ["앞치마와 고무장갑", "배추와 양념 재료", "현장 시식"],
    bring: ["김치를 담아 갈 가방", "양념이 튀어도 되는 편한 옷", "마실 물"],
    notes: [
      "야외에서 진행해서 추운 날에는 따뜻하게 입고 오세요.",
      ...COMMON_NOTES,
    ],
  },
};

export function getExperienceContent(id: string): ExperienceContent | null {
  return EXPERIENCE_CONTENT[id] ?? null;
}
