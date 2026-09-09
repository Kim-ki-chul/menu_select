// 위치 등록 -> 날씨/메뉴 후보 -> 메뉴 선택 -> 맛집 5곳 순으로 화면을 채우는 프론트 로직
const locationDisplay = document.getElementById('location-display');
const locationForm = document.getElementById('location-form');
const addressInput = document.getElementById('address-input');
const currentLocationBtn = document.getElementById('current-location-btn');
const weatherSection = document.getElementById('weather-section');
const weatherDisplay = document.getElementById('weather-display');
const categorySection = document.getElementById('category-section');
const categoryButtons = document.querySelectorAll('#category-buttons .category-btn');
const cuisineSection = document.getElementById('cuisine-section');
const cuisineButtons = document.querySelectorAll('#cuisine-buttons .category-btn');
const radiusSection = document.getElementById('radius-section');
const menuSection = document.getElementById('menu-section');
const menuCandidates = document.getElementById('menu-candidates');
const recommendReasonEl = document.getElementById('recommend-reason');
const refreshMenuBtn = document.getElementById('refresh-menu-btn');
const menuSearchForm = document.getElementById('menu-search-form');
const menuSearchInput = document.getElementById('menu-search-input');
const restaurantSection = document.getElementById('restaurant-section');
const chosenMenuEl = document.getElementById('chosen-menu');
const radiusNoteEl = document.getElementById('radius-note');
const radiusBubbles = document.querySelectorAll('.radius-bubble');
const radiusLineFill = document.getElementById('radius-line-fill');
const radiusValueEl = document.getElementById('radius-value');
const restaurantList = document.getElementById('restaurant-list');
const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');
const errorMessage = document.getElementById('error-message');

let currentMenu = null;
let currentRadius = 500;
let currentCategory = '점심';
let currentCuisine = '아무거나';

const WEATHER_ICONS = { 비: '🌧️', 더움: '☀️', 추움: '❄️', 보통: '⛅' };

// 선택한 값까지의 버블과 그 사이 선을 전부 채운다 (예: 400m 선택 시 100~400m 버블+선 전부 색칠)
function selectRadiusBubble(value) {
  currentRadius = Number(value);
  radiusValueEl.textContent = `${currentRadius}m`;
  radiusBubbles.forEach((b) => b.classList.toggle('selected', Number(b.dataset.radius) <= currentRadius));

  const selectedIndex = Array.from(radiusBubbles).findIndex((b) => Number(b.dataset.radius) === currentRadius);
  const fraction = selectedIndex / (radiusBubbles.length - 1);
  radiusLineFill.style.width = `calc((100% - 8px) * ${fraction})`;
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.hidden = !msg;
}

// 이 메뉴들을 왜 추천했는지 + 무엇을 참고했는지 근거 문장을 만든다 (카테고리 / 날씨 API / 최근 추천 기록)
function buildRecommendReason(data) {
  const weatherSource = data.weatherConnected
    ? `기상청 단기예보(현재 ${data.temp}도씨 · ${data.bucket})`
    : `기본 날씨 기준(${data.bucket}, 기상청 연동 안 됨)`;
  const cuisinePart = data.cuisine && data.cuisine !== '아무거나' ? `(${data.cuisine})` : '';
  const fallbackPart = data.cuisineFallback
    ? ` 다만 '${data.category}'·${data.bucket} 날씨엔 '${data.cuisine}' 메뉴가 없어서 전체 메뉴 중에서 골랐습니다.`
    : '';
  return `'${data.category}'${cuisinePart} 카테고리와 ${weatherSource}를 참고해 메뉴를 골랐습니다.${fallbackPart}`;
}

// 식당 하나(카카오 정보 + 구글 별점/사진)를 우측 미리보기 블록 HTML로 렌더링
function renderPreview(restaurant) {
  if (!restaurant) return '';
  const g = restaurant.google;
  const photo = g?.photoUrl ? `<img class="preview-photo" src="${g.photoUrl}" alt="">` : '';
  const rating = g?.rating ? `<span class="preview-rating">★${g.rating.toFixed(1)}</span>` : '';
  const reviews = g?.reviewCount ? `<span class="preview-reviews">리뷰 ${g.reviewCount}</span>` : '';
  return `<span class="menu-preview">${photo}<span class="preview-text"><span class="preview-name">${restaurant.name}</span>${rating}${reviews}</span></span>`;
}

async function loadHistory() {
  const res = await fetch('/api/history');
  const data = await res.json();
  historyList.innerHTML = '';
  if (data.history.length === 0) {
    historyList.textContent = '아직 선택한 메뉴가 없습니다.';
  } else {
    data.history.forEach((h) => {
      const li = document.createElement('li');
      const shortDate = h.date.slice(5).replace('-', '/');
      li.textContent = `${shortDate} · ${h.category} : ${h.menu}`;
      historyList.appendChild(li);
    });
  }
  historySection.hidden = false;
}

async function loadLocation() {
  const res = await fetch('/api/location');
  const data = await res.json();
  if (data.address) {
    locationDisplay.textContent = `현재 위치: ${data.address}`;
    locationDisplay.hidden = false;
    await loadRecommendation(currentRadius);
    await loadHistory();
  } else {
    locationDisplay.hidden = true;
  }
}

async function loadRecommendation(radius) {
  showError('');
  const params = new URLSearchParams({ category: currentCategory, cuisine: currentCuisine });
  if (radius) params.set('radius', radius);
  const res = await fetch(`/api/recommend?${params}`);
  const data = await res.json();
  if (!res.ok) return showError(data.error);

  const weatherIcon = WEATHER_ICONS[data.bucket] || '';
  weatherDisplay.textContent = data.weatherConnected
    ? `오늘 날씨 (기상청_단기예보) : 현재 ${data.temp}도씨 / ${weatherIcon} ${data.bucket}`
    : `오늘 날씨 (기상청_단기예보) : 연동 안 됨 (기본 추천: ${weatherIcon} ${data.bucket})`;
  weatherSection.hidden = false;
  categorySection.hidden = false;
  cuisineSection.hidden = false;
  radiusSection.hidden = false;

  menuCandidates.innerHTML = '';
  if (data.candidates.length === 0) {
    menuCandidates.textContent = '현재 조건(카테고리/음식종류/반경)에 맞는 식당이 없습니다. 반경을 넓히거나 다른 조건으로 다시 시도해보세요.';
  } else {
    data.candidates.forEach((c) => {
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.innerHTML = `<span class="menu-name">${c.menu}</span>${renderPreview(c.topRestaurant)}`;
      btn.addEventListener('click', () => loadRestaurants(c.menu));
      menuCandidates.appendChild(btn);
    });
  }
  recommendReasonEl.textContent = buildRecommendReason(data);
  menuSection.hidden = false;
  restaurantSection.hidden = true;
}

async function loadRestaurants(menuName, radius) {
  showError('');
  currentMenu = menuName;
  const params = new URLSearchParams({ menu: menuName, category: currentCategory });
  if (radius) params.set('radius', radius);
  const res = await fetch(`/api/restaurants?${params}`);
  const data = await res.json();
  if (!res.ok) return showError(data.error);

  chosenMenuEl.textContent = data.menu;
  radiusNoteEl.textContent = `(반경 ${data.radiusUsed}m 기준)`;
  restaurantList.innerHTML = '';

  if (data.restaurants.length === 0) {
    restaurantList.textContent = '현재 조건(반경 등)에 맞는 식당이 없습니다. 반경을 넓혀보세요.';
  } else {
    data.restaurants.forEach((r) => {
      const g = r.google;
      const photo = g?.photoUrl ? `<img class="card-photo" src="${g.photoUrl}" alt="">` : '';
      const rating = g?.rating ? `★${g.rating.toFixed(1)}` : '';
      const reviews = g?.reviewCount ? ` · 리뷰 ${g.reviewCount}` : '';
      const a = document.createElement('a');
      a.className = 'restaurant-card';
      a.href = r.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = `${photo}<div class="card-text"><div class="name">${r.name} ${rating}</div><div class="meta">${r.address} · ${r.distance}m${reviews}</div></div>`;
      restaurantList.appendChild(a);
    });
  }
  restaurantSection.hidden = false;
  await loadHistory();
}

categoryButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentCategory = btn.dataset.category;
    categoryButtons.forEach((b) => b.classList.toggle('selected', b === btn));
    currentMenu = null;
    loadRecommendation(currentRadius);
  });
});

cuisineButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentCuisine = btn.dataset.cuisine;
    cuisineButtons.forEach((b) => b.classList.toggle('selected', b === btn));
    currentMenu = null;
    loadRecommendation(currentRadius);
  });
});

refreshMenuBtn.addEventListener('click', () => {
  currentMenu = null;
  loadRecommendation(currentRadius);
});

menuSearchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = menuSearchInput.value.trim();
  if (!query) return;
  loadRestaurants(query, currentRadius);
});

selectRadiusBubble(currentRadius);

radiusBubbles.forEach((bubble) => {
  bubble.addEventListener('click', async () => {
    selectRadiusBubble(bubble.dataset.radius);
    const menuToReload = currentMenu;
    await loadRecommendation(currentRadius);
    if (menuToReload) await loadRestaurants(menuToReload, currentRadius);
  });
});

locationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const res = await fetch('/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: addressInput.value }),
  });
  const data = await res.json();
  if (!res.ok) return showError(data.error);
  addressInput.value = '';
  await loadLocation();
});

currentLocationBtn.addEventListener('click', () => {
  showError('');
  if (!navigator.geolocation) return showError('이 브라우저는 위치 정보를 지원하지 않습니다.');

  currentLocationBtn.disabled = true;
  currentLocationBtn.textContent = '위치 확인 중...';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const res = await fetch('/api/location/current', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await loadLocation();
      } catch (err) {
        showError(err.message);
      } finally {
        currentLocationBtn.disabled = false;
        currentLocationBtn.textContent = '📍 현 위치로 설정';
      }
    },
    () => {
      showError('위치 정보를 가져올 수 없습니다. 브라우저 권한을 확인해주세요.');
      currentLocationBtn.disabled = false;
      currentLocationBtn.textContent = '📍 현 위치로 설정';
    }
  );
});

loadLocation();
