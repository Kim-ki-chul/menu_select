// 추천 history를 메뉴별/카테고리별 선택 횟수로 집계하는 로직
function countBy(history, key) {
  const counts = new Map();
  for (const h of history) counts.set(h[key], (counts.get(h[key]) || 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function aggregate(history, topN = 5) {
  return {
    total: history.length,
    byMenu: countBy(history, 'menu').slice(0, topN),
    byCategory: countBy(history, 'category'),
  };
}

module.exports = { aggregate };
