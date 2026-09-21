// Express 서버 - 정적 프론트 서빙 + 카카오/네이버/기상청 API 프록시
require('dotenv').config();
const express = require('express');
const store = require('./lib/store');
const kakao = require('./lib/kakao');
const weather = require('./lib/weather');
const menu = require('./lib/menu');
const naver = require('./lib/naver');
const google = require('./lib/google');
const stats = require('./lib/stats');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/api/history', async (req, res) => {
  const data = await store.load();
  res.json({ history: [...data.history].reverse().slice(0, 10) });
});

app.get('/api/stats', async (req, res) => {
  const data = await store.load();
  res.json(stats.aggregate(data.history));
});

app.get('/api/location', async (req, res) => {
  const data = await store.load();
  res.json({ address: data.address, lat: data.lat, lng: data.lng });
});

app.post('/api/location', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: '주소를 입력해주세요.' });

  try {
    const { lat, lng } = await kakao.geocodeAddress(address);
    const data = await store.load();
    await store.save({ ...data, address, lat, lng });
    res.json({ address, lat, lng });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/location/current', async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: '위치 좌표가 올바르지 않습니다.' });
  }

  try {
    const address = await kakao.reverseGeocode(lat, lng);
    const data = await store.load();
    await store.save({ ...data, address, lat, lng });
    res.json({ address, lat, lng });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/recommend', async (req, res) => {
  const requestedRadius = Number(req.query.radius);
  const category = req.query.category || '점심';
  const cuisine = req.query.cuisine || '아무거나';
  const data = await store.load();
  if (!data.lat) return res.status(400).json({ error: '먼저 위치를 등록해주세요.' });

  const { bucket, temp, connected } = await weather.getWeatherBucket(data.lat, data.lng);
  const cuisineFallback = !menu.cuisineHasOptions(category, bucket, cuisine);

  // 후보 풀 전체를 무작위 순서로 받아서, 실제로 주변에 식당이 있는 메뉴만 최대 5개까지 채운다
  // (식당이 하나도 없는 메뉴는 후보 자체에서 제외 — 상세 정보 없는 후보를 보여주지 않기 위함)
  const pool = menu.getCandidateMenus(category, bucket, cuisine, 99);
  const candidates = [];
  for (const name of pool) {
    if (candidates.length >= 5) break;
    const { places } = requestedRadius
      ? await kakao.searchAtFixedRadius(name, data.lat, data.lng, requestedRadius)
      : await kakao.searchRestaurants(name, data.lat, data.lng, 1);
    const top = places[0];
    if (!top) continue;
    const info = await google.findPlaceInfo(top.name, data.lat, data.lng);
    candidates.push({ menu: name, topRestaurant: { ...top, google: info } });
  }

  res.json({ bucket, temp, weatherConnected: connected, category, cuisine, cuisineFallback, candidates });
});

app.get('/api/photo', async (req, res) => {
  const { name } = req.query;
  if (!name || !process.env.GOOGLE_MAPS_API_KEY) return res.status(404).end();

  const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=400&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const googleRes = await fetch(url);
  if (!googleRes.ok) return res.status(404).end();

  res.set('Content-Type', googleRes.headers.get('content-type') || 'image/jpeg');
  res.send(Buffer.from(await googleRes.arrayBuffer()));
});

app.get('/api/restaurants', async (req, res) => {
  const selectedMenu = req.query.menu;
  if (!selectedMenu) return res.status(400).json({ error: '메뉴를 지정해주세요.' });

  const requestedRadius = Number(req.query.radius);
  const category = req.query.category || '점심';
  const data = await store.load();
  if (!data.lat) return res.status(400).json({ error: '먼저 위치를 등록해주세요.' });

  try {
    const { radiusUsed, places } = requestedRadius
      ? await kakao.searchAtFixedRadius(selectedMenu, data.lat, data.lng, requestedRadius)
      : await kakao.searchRestaurants(selectedMenu, data.lat, data.lng);
    const ranked = await naver.rankByPopularity(places);
    const top5 = await google.attachPlaceInfo(ranked.slice(0, 5), data.lat, data.lng);

    await store.save({ ...data, history: menu.recordChoice(data.history, category, selectedMenu) });
    res.json({ menu: selectedMenu, radiusUsed, restaurants: top5 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

module.exports = app;
