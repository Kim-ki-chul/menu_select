// 카카오 로컬 API - 주소→좌표 변환, 반경 확장을 포함한 음식점 키워드 검색
const KAKAO_BASE = 'https://dapi.kakao.com/v2/local';
const RADIUS_STEPS_M = [100, 300, 500, 1000, 2000];

function authHeader() {
  return { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` };
}

async function geocodeAddress(address) {
  const url = `${KAKAO_BASE}/search/address.json?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error(`카카오 주소 검색 실패: ${res.status}`);
  const data = await res.json();
  const doc = data.documents[0];
  if (!doc) throw new Error('주소를 찾을 수 없습니다.');
  return { lat: Number(doc.y), lng: Number(doc.x) };
}

async function reverseGeocode(lat, lng) {
  const url = `${KAKAO_BASE}/geo/coord2address.json?x=${lng}&y=${lat}`;
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error(`카카오 좌표→주소 변환 실패: ${res.status}`);
  const data = await res.json();
  const doc = data.documents[0];
  if (!doc) throw new Error('현재 위치의 주소를 찾을 수 없습니다.');
  return doc.road_address?.address_name || doc.address.address_name;
}

async function fetchAtRadius(menu, lat, lng, radius) {
  const url = `${KAKAO_BASE}/search/keyword.json?query=${encodeURIComponent(menu)}` +
    `&x=${lng}&y=${lat}&radius=${radius}&category_group_code=FD6&sort=accuracy&size=15`;
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error(`카카오 장소 검색 실패: ${res.status}`);
  const data = await res.json();
  return data.documents.map((d) => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    distance: Number(d.distance),
    url: d.place_url,
  }));
}

// 반경을 지정하지 않았을 때: 100m부터 시작해 5곳이 모일 때까지 자동 확장
async function searchRestaurants(menu, lat, lng, minResults = 15) {
  for (const radius of RADIUS_STEPS_M) {
    const places = await fetchAtRadius(menu, lat, lng, radius);
    if (places.length >= minResults || radius === RADIUS_STEPS_M[RADIUS_STEPS_M.length - 1]) {
      return { radiusUsed: radius, places };
    }
  }
  return { radiusUsed: RADIUS_STEPS_M[RADIUS_STEPS_M.length - 1], places: [] };
}

// 사용자가 반경을 직접 지정했을 때: 확장 없이 그 반경으로만 검색
async function searchAtFixedRadius(menu, lat, lng, radius) {
  const places = await fetchAtRadius(menu, lat, lng, radius);
  return { radiusUsed: radius, places };
}

module.exports = { geocodeAddress, reverseGeocode, searchRestaurants, searchAtFixedRadius };
