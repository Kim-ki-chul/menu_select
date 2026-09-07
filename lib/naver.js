// 네이버 블로그 검색 API로 상호명 언급량을 인기도 보조 지표로 조회
async function getMentionCount(placeName) {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) return 0;

  try {
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(placeName)}&display=1`;
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      },
    });
    if (!res.ok) throw new Error(`네이버 검색 API 실패: ${res.status}`);
    const data = await res.json();
    return data.total || 0;
  } catch (err) {
    console.error('[naver] 언급량 조회 실패:', err.message);
    return 0;
  }
}

async function rankByPopularity(places) {
  const withCounts = await Promise.all(
    places.map(async (p) => ({ ...p, mentions: await getMentionCount(p.name) }))
  );
  return withCounts.sort((a, b) => b.mentions - a.mentions);
}

module.exports = { getMentionCount, rankByPopularity };
