// 한국관광공사 TourAPI(공공데이터포털, KorService2)로 대표메뉴/취급메뉴 등 매장 상세 정보를 조회
// 스크래핑 없이 정부 공식 오픈API만 사용 (CLAUDE.md 정책)
// searchKeyword2는 좌표 필터를 지원하지 않아, locationBasedList2(반경 내 목록 + 거리)로 후보를 받아
// 상호명으로 매칭한다 (전국 동명 매장이 많아 좌표 없이는 엉뚱한 지점이 잡힐 수 있음).
const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';
const APP_NAME = encodeURIComponent('메뉴결정장애');

function normalize(name) {
  return name.replace(/\s+/g, '').toLowerCase();
}

function toArray(item) {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

async function findContentId(placeName, lat, lng, radius) {
  const url = `${BASE_URL}/locationBasedList2?serviceKey=${process.env.TOUR_API_KEY}` +
    `&MobileOS=ETC&MobileApp=${APP_NAME}&_type=json` +
    `&contentTypeId=39&arrange=E&mapX=${lng}&mapY=${lat}&radius=${radius}&numOfRows=100&pageNo=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TourAPI 위치기반 조회 실패: ${res.status}`);
  const data = await res.json();
  const items = toArray(data.response?.body?.items?.item);

  const target = normalize(placeName);
  const matches = items.filter((item) => {
    const title = normalize(item.title);
    return title.includes(target) || target.includes(title);
  });
  if (matches.length === 0) return null;

  matches.sort((a, b) => Number(a.dist) - Number(b.dist));
  return matches[0].contentid;
}

async function findMenuInfo(placeName, lat, lng, radius = 1000) {
  if (!process.env.TOUR_API_KEY) return null;

  try {
    const contentId = await findContentId(placeName, lat, lng, radius);
    if (!contentId) return null;

    const url = `${BASE_URL}/detailIntro2?serviceKey=${process.env.TOUR_API_KEY}` +
      `&MobileOS=ETC&MobileApp=${APP_NAME}&_type=json` +
      `&contentId=${contentId}&contentTypeId=39`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TourAPI 상세 조회 실패: ${res.status}`);
    const data = await res.json();
    const info = toArray(data.response?.body?.items?.item)[0];
    if (!info) return null;

    return {
      firstMenu: info.firstmenu || null,
      treatMenu: info.treatmenu || null,
      openTime: info.opentimefood || null,
      restDate: info.restdatefood || null,
    };
  } catch (err) {
    console.error('[tourapi] 조회 실패:', err.message);
    return null;
  }
}

async function attachMenuInfo(places, lat, lng, radius) {
  return Promise.all(
    places.map(async (p) => ({ ...p, tour: await findMenuInfo(p.name, lat, lng, radius) }))
  );
}

module.exports = { findMenuInfo, attachMenuInfo };
