// menu.js의 카테고리별 중복 제외 로직에 대한 최소 self-check
const assert = require('assert');
const { getCandidateMenus, getLastMenu, getRecentMenus, cuisineHasOptions, recordChoice, CATEGORY_TABLES, MENU_CUISINE } = require('../lib/menu');

// 같은 카테고리의 가장 최근 추천 메뉴는 후보에서 제외되어야 한다
for (let i = 0; i < 20; i++) {
  const history = [{ date: '2026-09-02', category: '점심', menu: '냉면' }];
  const candidates = getCandidateMenus('점심', '더움', '아무거나', history, 3);
  assert.ok(!candidates.includes('냉면'), '직전 메뉴가 후보에 포함됨');
}

// 다른 카테고리의 기록은 이 카테고리 후보 제외에 영향을 주면 안 된다
const crossCategoryHistory = [{ date: '2026-09-03', category: '저녁', menu: '삼겹살' }];
const lunchPool = CATEGORY_TABLES['점심']['보통'];
const lunchCandidates = getCandidateMenus('점심', '보통', '아무거나', crossCategoryHistory, lunchPool.length);
assert.strictEqual(lunchCandidates.length, lunchPool.length, '다른 카테고리 기록 때문에 후보가 줄어듦');
assert.ok(lunchPool.every((m) => lunchCandidates.includes(m)), '점심 후보 풀에서 메뉴가 잘못 빠짐');

// 풀 전체가 직전 메뉴 하나뿐이어도 빈 배열을 반환하지 않아야 한다 (폴백)
const tinyHistory = [{ date: '2026-09-02', category: '아침', menu: CATEGORY_TABLES['아침']['비'][0] }];
const fallback = getCandidateMenus('아침', '비', '아무거나', tinyHistory, 3);
assert.ok(fallback.length > 0, '후보가 비어있음');

// 음식 종류(cuisine)를 지정하면 그 종류의 메뉴만 나와야 한다
const koreanOnly = getCandidateMenus('점심', '보통', '한식', [], lunchPool.length);
assert.ok(koreanOnly.every((m) => MENU_CUISINE[m] === '한식'), '한식 필터인데 다른 종류가 섞임');

// 그 날씨에 해당 음식 종류가 없으면 전체 풀로 폴백해야 한다 (빈 배열 대신)
const noWesternInRain = getCandidateMenus('점심', '비', '양식', [], 3);
assert.ok(noWesternInRain.length > 0, '해당 음식 종류가 없을 때 폴백이 안 됨');

// history는 최근 30개까지만 유지
let history = [];
for (let i = 0; i < 40; i++) history = recordChoice(history, '점심', '메뉴' + i);
assert.strictEqual(history.length, 30, 'history 길이가 30이 아님');
assert.strictEqual(history[history.length - 1].menu, '메뉴39', '마지막 기록이 유지되지 않음');

// 같은 날 같은 카테고리+메뉴 재기록은 중복되면 안 된다 (반경만 바꿔 재검색한 경우)
let dedupHistory = recordChoice([], '점심', '떡볶이', new Date('2026-09-03'));
dedupHistory = recordChoice(dedupHistory, '점심', '떡볶이', new Date('2026-09-03'));
assert.strictEqual(dedupHistory.length, 1, '같은 카테고리+메뉴가 중복 기록됨');

// 카테고리가 다르면 같은 날 같은 메뉴여도 별도로 기록돼야 한다
let multiCategoryHistory = recordChoice([], '점심', '국밥', new Date('2026-09-03'));
multiCategoryHistory = recordChoice(multiCategoryHistory, '저녁', '국밥', new Date('2026-09-03'));
assert.strictEqual(multiCategoryHistory.length, 2, '카테고리가 다른데 기록이 합쳐짐');

// getLastMenu는 해당 카테고리의 가장 최근 기록만 찾아야 한다
const mixedHistory = [
  { date: '2026-09-01', category: '점심', menu: '초밥' },
  { date: '2026-09-02', category: '저녁', menu: '삼겹살' },
  { date: '2026-09-03', category: '점심', menu: '냉면' },
];
assert.strictEqual(getLastMenu(mixedHistory, '점심'), '냉면', '점심 카테고리의 최근 메뉴를 잘못 찾음');
assert.strictEqual(getLastMenu(mixedHistory, '아침'), null, '기록 없는 카테고리는 null이어야 함');

// 회식은 모든 날씨에 중식/일식/양식이 최소 하나씩 있어야 한다 (전에는 전부 한식뿐이라 항상 폴백됐음)
for (const bucket of ['비', '더움', '추움', '보통']) {
  for (const cuisine of ['중식', '일식', '양식']) {
    assert.strictEqual(cuisineHasOptions('회식', bucket, cuisine), true, `회식/${bucket}에 ${cuisine} 옵션이 없음`);
  }
}

// cuisineHasOptions: '아무거나'는 항상 true, 매치가 없으면 false
assert.strictEqual(cuisineHasOptions('점심', '비', '아무거나'), true, "'아무거나'는 항상 true여야 함");
assert.strictEqual(cuisineHasOptions('점심', '비', '양식'), false, '점심/비엔 양식이 없는데 true로 나옴');

// 최근 3개(같은 카테고리) 안에 든 메뉴는 후보에서 제외되어야 한다 (반복 추천 방지 업그레이드)
const threeInARow = [
  { date: '2026-09-01', category: '점심', menu: '냉면' },
  { date: '2026-09-02', category: '점심', menu: '비빔밥' },
  { date: '2026-09-03', category: '점심', menu: '백반' },
];
for (let i = 0; i < 20; i++) {
  const candidates = getCandidateMenus('점심', '더움', '한식', threeInARow, 5);
  assert.ok(!candidates.includes('냉면') && !candidates.includes('비빔밥') && !candidates.includes('백반'),
    '최근 3개 안의 메뉴가 후보에 다시 나옴');
}

// getRecentMenus는 최신순으로, 지정한 개수만큼만, 같은 카테고리만 반환해야 한다
const recent = getRecentMenus(threeInARow, '점심', 2);
assert.deepStrictEqual(recent, ['백반', '비빔밥'], 'getRecentMenus가 최신순 2개를 잘못 반환함');

// 점심 카테고리엔 '백반'이 최소 한 날씨 버킷에는 있어야 한다 (사용자가 백반이 없다고 지적함)
const hasBaekban = Object.values(CATEGORY_TABLES['점심']).some((pool) => pool.includes('백반'));
assert.ok(hasBaekban, "점심 카테고리에 '백반'이 없음");

console.log('menu.test.js: 모든 테스트 통과');
