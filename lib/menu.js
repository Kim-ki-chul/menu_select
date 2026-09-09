// 카테고리(아침/점심/저녁/회식) x 날씨 버킷별 후보 메뉴 테이블
// 메뉴 목록은 웹에 공개된 "직장인 점심/저녁/회식 메뉴 추천 100선" 등을 참고해 늘림 (2026-09-03)
const CATEGORY_TABLES = {
  아침: {
    비: ['죽', '계란토스트', '우동', '딤섬', '시래기국밥', '콩나물국밥', '어묵탕'],
    더움: ['시리얼', '요거트볼', '냉모밀', '오이냉국', '스무디', '콩국수', '유부초밥'],
    추움: ['뜨끈한 국밥', '호빵', '죽', '만두', '미소국', '수프', '우거지해장국', '어묵탕'],
    보통: ['토스트', '김밥', '샌드위치', '베이글', '주먹밥', '백반', '계란말이', '프렌치토스트', '누룽지'],
  },
  점심: {
    비: ['칼국수', '부대찌개', '파전', '라멘', '짬뽕', '우동', '수제비', '김치찌개', '된장찌개', '순두부찌개', '감자탕', '알탕'],
    더움: ['냉면', '비빔밥', '백반', '삼계탕', '냉모밀', '샐러드', '콩국수', '열무국수', '회덮밥', '냉짬뽕'],
    추움: ['국밥', '순댓국', '짬뽕', '찌개백반', '김치찌개', '우동', '갈비탕', '설렁탕', '뼈해장국', '육개장'],
    보통: ['김치찌개', '된장찌개', '백반', '제육볶음', '돈까스', '초밥', '떡볶이', '짜장면', '비빔밥', '불고기', '닭갈비', '규동', '볶음밥', '탕수육'],
  },
  저녁: {
    비: ['부대찌개', '전골', '라멘', '파전', '짬뽕', '우동', '해물파전', '동태찌개', '순두부찌개'],
    더움: ['삼겹살', '냉면', '초밥', '회', '냉모밀', '삼계탕', '조개구이', '냉짜장'],
    추움: ['국밥', '찌개', '전골', '곱창', '갈비탕', '짬뽕', '감자탕', '매운탕', '나베', '스튜'],
    보통: ['삼겹살', '치킨', '파스타', '초밥', '국밥', '제육볶음', '짜장면', '백반', '불고기', '닭갈비', '돈까스', '스테이크'],
  },
  // 회식은 한식(삼겹살류)에 치우치기 쉬워서 각 날씨마다 중식/일식/양식 옵션을 최소 1개씩 넣어둠
  회식: {
    비: ['삼겹살', '곱창전골', '부대찌개', '전골', '마라탕', '이자카야 안주', '크림파스타', '해물탕', '짜글이'],
    더움: ['삼겹살', '냉삼', '회', '치킨', '양꼬치', '스시 모둠', '스테이크', '조개구이', '감바스'],
    추움: ['곱창', '국밥', '전골', '삼겹살', '훠궈', '나베', '스튜', '매운탕', '감자탕'],
    보통: ['삼겹살', '곱창', '치킨', '족발', '보쌈', '짜장면', '초밥', '파스타', '찜닭', '양념갈비', '소고기구이', '탕수육', '돈까스', '피자'],
  },
};

// 메뉴별 음식 종류 태그 (한식/중식/일식/양식 필터링용)
const MENU_CUISINE = {
  죽: '한식', 계란토스트: '양식', 우동: '일식', 시리얼: '양식', 요거트볼: '양식', 냉모밀: '일식',
  '뜨끈한 국밥': '한식', 호빵: '한식', 토스트: '양식', 김밥: '한식', 샌드위치: '양식', 베이글: '양식',
  칼국수: '한식', 부대찌개: '한식', 파전: '한식', 라멘: '일식', 냉면: '한식', 비빔밥: '한식',
  샐러드: '양식', 국밥: '한식', 순댓국: '한식', 짬뽕: '중식', 찌개백반: '한식', 김치찌개: '한식',
  돈까스: '일식', 초밥: '일식', 떡볶이: '한식', 짜장면: '중식', 전골: '한식', 삼겹살: '한식',
  회: '한식', 찌개: '한식', 곱창: '한식', 치킨: '한식', 파스타: '양식', 곱창전골: '한식',
  냉삼: '한식', 족발: '한식', 보쌈: '한식',
  마라탕: '중식', '이자카야 안주': '일식', 크림파스타: '양식', 양꼬치: '중식',
  '스시 모둠': '일식', 스테이크: '양식', 훠궈: '중식', 나베: '일식', 스튜: '양식',
  딤섬: '중식', 시래기국밥: '한식', 오이냉국: '한식', 콩나물국밥: '한식', 만두: '중식',
  미소국: '일식', 수프: '양식', 주먹밥: '일식', 백반: '한식',
  수제비: '한식', 삼계탕: '한식', 콩국수: '한식', 갈비탕: '한식', 된장찌개: '한식', 제육볶음: '한식',
  순두부찌개: '한식', 감자탕: '한식', 알탕: '한식', 열무국수: '한식', 회덮밥: '일식', 냉짬뽕: '중식',
  설렁탕: '한식', 뼈해장국: '한식', 육개장: '한식', 불고기: '한식', 닭갈비: '한식', 규동: '일식',
  볶음밥: '중식', 탕수육: '중식', 해물파전: '한식', 동태찌개: '한식', 조개구이: '한식', 냉짜장: '중식',
  매운탕: '한식', 어묵탕: '한식', 유부초밥: '일식', 스무디: '양식', 계란말이: '한식',
  프렌치토스트: '양식', 누룽지: '한식', 우거지해장국: '한식', 감바스: '양식', 찜닭: '한식',
  양념갈비: '한식', 소고기구이: '한식', 피자: '양식', 해물탕: '한식', 짜글이: '한식',
};

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getLastMenu(history, category) {
  return [...history].reverse().find((h) => h.category === category)?.menu ?? null;
}

// 이 카테고리에서 최근 고른 메뉴 n개 (최신순) - 반복 추천을 피하는 데 사용
function getRecentMenus(history, category, n = 3) {
  return [...history].reverse().filter((h) => h.category === category).slice(0, n).map((h) => h.menu);
}

// 이 카테고리+날씨 풀에 해당 음식 종류가 실제로 있는지 (없으면 전체 풀로 조용히 폴백되므로, 그 사실을 알리는 데 사용)
function cuisineHasOptions(category, bucket, cuisine) {
  if (!cuisine || cuisine === '아무거나') return true;
  const table = CATEGORY_TABLES[category] || CATEGORY_TABLES['점심'];
  const pool = table[bucket] || table['보통'];
  return pool.some((m) => MENU_CUISINE[m] === cuisine);
}

function getCandidateMenus(category, bucket, cuisine, count = 3) {
  const table = CATEGORY_TABLES[category] || CATEGORY_TABLES['점심'];
  const pool = table[bucket] || table['보통'];
  const cuisineFiltered = !cuisine || cuisine === '아무거나' ? pool : pool.filter((m) => MENU_CUISINE[m] === cuisine);
  const basePool = cuisineFiltered.length > 0 ? cuisineFiltered : pool; // 해당 날씨에 그 음식 종류가 없으면 전체 풀로 폴백

  return pickRandom(basePool, Math.min(count, basePool.length));
}

function todayString(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function recordChoice(history, category, menu, now = new Date()) {
  const today = todayString(now);
  const last = history[history.length - 1];
  if (last && last.date === today && last.category === category && last.menu === menu) return history; // 같은 메뉴 반경만 재검색한 경우 중복 기록 방지
  const next = [...history, { date: today, category, menu }];
  return next.slice(-30);
}

module.exports = {
  CATEGORY_TABLES, MENU_CUISINE, getCandidateMenus, getLastMenu, getRecentMenus,
  cuisineHasOptions, recordChoice, todayString,
};
