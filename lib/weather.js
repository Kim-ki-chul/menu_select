// 위경도를 기상청 격자좌표로 변환하고 초단기실황을 조회해 날씨 버킷(비/더움/추움/보통)으로 분류
const KMA_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';

// 기상청 공식 격자좌표 변환식 (Lambert Conformal Conic)
function latLngToGrid(lat, lng) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0 * (Math.PI / 180);
  const SLAT2 = 60.0 * (Math.PI / 180);
  const OLON = 126.0 * (Math.PI / 180);
  const OLAT = 38.0 * (Math.PI / 180);
  const XO = 43;
  const YO = 136;

  const re = RE / GRID;
  let sn = Math.tan(Math.PI * 0.25 + SLAT2 * 0.5) / Math.tan(Math.PI * 0.25 + SLAT1 * 0.5);
  sn = Math.log(Math.cos(SLAT1) / Math.cos(SLAT2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + SLAT1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(SLAT1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + OLAT * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + (lat * Math.PI) / 180 * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = (lng * Math.PI) / 180 - OLON;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

// 초단기실황은 매시 정각 발표, 조회는 40분 이후부터 안정적으로 가능
function currentBaseDateTime(now = new Date()) {
  const base = new Date(now);
  if (base.getMinutes() < 40) base.setHours(base.getHours() - 1);
  const pad = (n) => String(n).padStart(2, '0');
  const base_date = `${base.getFullYear()}${pad(base.getMonth() + 1)}${pad(base.getDate())}`;
  const base_time = `${pad(base.getHours())}00`;
  return { base_date, base_time };
}

function classify(items) {
  const get = (category) => items.find((i) => i.category === category)?.obsrValue;
  const pty = Number(get('PTY') ?? 0);
  const temp = Number(get('T1H') ?? 20);
  let bucket = '보통';
  if (pty > 0) bucket = '비';
  else if (temp >= 28) bucket = '더움';
  else if (temp <= 5) bucket = '추움';
  return { bucket, temp };
}

async function getWeatherBucket(lat, lng) {
  if (!process.env.KMA_SERVICE_KEY) return { bucket: '보통', temp: null, connected: false };

  try {
    const { nx, ny } = latLngToGrid(lat, lng);
    const { base_date, base_time } = currentBaseDateTime();
    const url = `${KMA_URL}?serviceKey=${process.env.KMA_SERVICE_KEY}&dataType=JSON` +
      `&numOfRows=10&pageNo=1&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`기상청 API 실패: ${res.status}`);
    const data = await res.json();
    const items = data.response?.body?.items?.item;
    if (!Array.isArray(items)) throw new Error('기상청 응답 형식 오류');
    const { bucket, temp } = classify(items);
    return { bucket, temp, connected: true };
  } catch (err) {
    console.error('[weather] 폴백 사용:', err.message);
    return { bucket: '보통', temp: null, connected: false };
  }
}

module.exports = { getWeatherBucket, latLngToGrid };
