// stats.js의 메뉴/카테고리 집계 로직에 대한 최소 self-check
const assert = require('assert');
const { aggregate } = require('../lib/stats');

const history = [
  { date: '2026-09-01', category: '점심', menu: '냉면' },
  { date: '2026-09-02', category: '점심', menu: '냉면' },
  { date: '2026-09-03', category: '저녁', menu: '삼겹살' },
];

const result = aggregate(history);
assert.strictEqual(result.total, 3, 'total이 전체 history 개수와 다름');
assert.deepStrictEqual(result.byMenu[0], { name: '냉면', count: 2 }, '가장 많이 고른 메뉴가 1위가 아님');
assert.ok(result.byCategory.some((c) => c.name === '저녁' && c.count === 1), '카테고리별 집계가 잘못됨');

// 빈 history는 빈 배열을 반환해야 한다 (에러 없이)
const empty = aggregate([]);
assert.strictEqual(empty.total, 0, '빈 history의 total이 0이 아님');
assert.deepStrictEqual(empty.byMenu, [], '빈 history인데 byMenu가 비어있지 않음');

// topN을 넘는 메뉴는 잘려야 한다
const manyMenus = Array.from({ length: 10 }, (_, i) => ({ date: '2026-09-01', category: '점심', menu: `메뉴${i}` }));
assert.strictEqual(aggregate(manyMenus, 3).byMenu.length, 3, 'topN으로 잘리지 않음');

console.log('stats.test.js: 모든 테스트 통과');
