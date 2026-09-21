// 구글 Places API(New)로 별점/리뷰수/사진 등을 조회 (카카오·네이버가 제공하지 않는 공식 데이터)
// photos 필드부터 이미 Enterprise+Atmosphere SKU 과금 대상이라, 같은 티어의 나머지 필드는 추가 비용 없이 함께 가져올 수 있다.
const FIELD_MASK = [
  'places.rating',
  'places.userRatingCount',
  'places.photos',
  'places.priceLevel',
  'places.regularOpeningHours',
  'places.editorialSummary',
].join(',');

const PRICE_LEVEL_LABEL = {
  PRICE_LEVEL_FREE: '무료',
  PRICE_LEVEL_INEXPENSIVE: '₩',
  PRICE_LEVEL_MODERATE: '₩₩',
  PRICE_LEVEL_EXPENSIVE: '₩₩₩',
  PRICE_LEVEL_VERY_EXPENSIVE: '₩₩₩₩',
};

async function findPlaceInfo(placeName, lat, lng) {
  if (!process.env.GOOGLE_MAPS_API_KEY) return null;

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: placeName,
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 300.0 } },
        pageSize: 1,
        languageCode: 'ko',
      }),
    });
    if (!res.ok) throw new Error(`구글 Places 검색 실패: ${res.status}`);
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    return {
      rating: place.rating ?? null,
      reviewCount: place.userRatingCount ?? null,
      photoUrl: place.photos?.[0]
        ? `/api/photo?name=${encodeURIComponent(place.photos[0].name)}`
        : null,
      priceLevel: PRICE_LEVEL_LABEL[place.priceLevel] ?? null,
      openNow: place.regularOpeningHours?.openNow ?? null,
      todayHours: place.regularOpeningHours?.weekdayDescriptions?.[(new Date().getDay() + 6) % 7] ?? null,
      summary: place.editorialSummary?.text ?? null,
    };
  } catch (err) {
    console.error('[google] 조회 실패:', err.message);
    return null;
  }
}

async function attachPlaceInfo(places, lat, lng) {
  return Promise.all(
    places.map(async (p) => ({ ...p, google: await findPlaceInfo(p.name, lat, lng) }))
  );
}

module.exports = { findPlaceInfo, attachPlaceInfo };
