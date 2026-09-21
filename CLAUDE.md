# CLAUDE.md

점심 뭐 먹지 추천 앱의 프로젝트 정책입니다.

## 스택

- Node.js + Express 서버(`server.js`) + 정적 프론트(`public/`). 별도 프레임워크 없음.
- Vercel(서버리스)에 배포. 서버리스 파일시스템은 읽기 전용이라 `data/store.json` 파일 저장 방식을 버리고, `lib/store.js`가 Supabase(Postgres, `app_store` 테이블에 JSONB 한 행)로 위치 + 메뉴 히스토리를 저장한다. 로컬 개발도 동일한 Supabase 프로젝트를 사용.
- `server.js`는 `require.main === module`일 때만 `app.listen()`하고, 그 외에는 `module.exports = app`으로 내보내 Vercel(`@vercel/node`)이 서버리스 핸들러로 사용한다. 배포 설정은 `vercel.json`.

## API 키

- `KAKAO_REST_API_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `KMA_SERVICE_KEY`, `GOOGLE_MAPS_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TOUR_API_KEY`는 `.env`에만 저장 (Vercel에서는 프로젝트 환경변수로 등록).
- `.env`는 절대 커밋하지 않음 (`.gitignore`에 포함). 새 키가 필요해지면 `.env.example`에 이름만 추가.
- `KMA_SERVICE_KEY`가 없어도 앱은 동작해야 함 (`lib/weather.js`가 "보통" 버킷으로 폴백).
- `GOOGLE_MAPS_API_KEY`가 없어도 앱은 동작해야 함 (`lib/google.js`가 별점/사진 없이 null 반환). `rating`/`userRatingCount`/`photos` 필드는 Places API Text Search의 Enterprise SKU 과금 대상 — 무료 크레딧 소진 여부를 가끔 확인할 것. photos부터 이미 최상위(Enterprise+Atmosphere) 티어라, `priceLevel`/`regularOpeningHours`/`editorialSummary` 등은 추가 비용 없이 같은 호출에 얹어 받는다.
- `TOUR_API_KEY`가 없어도 앱은 동작해야 함 (`lib/tourapi.js`가 대표메뉴 없이 null 반환). 한국관광공사 TourAPI(공공데이터포털, KorService2)로 식당의 대표메뉴/취급메뉴를 조회 — 스크래핑이 아닌 공식 오픈API. `locationBasedList2`(반경 내 목록+거리)로 후보를 받아 상호명 매칭 후 `detailIntro2`로 상세를 가져오는 2단계 호출(`searchKeyword2`는 좌표 필터가 없어서 제외함). **커버리지가 관광 목적으로 선별된 데이터셋이라 한정식/전통 맛집 등은 잘 잡히지만 프랜차이즈 체인점은 매칭 안 되는 경우가 많음** (실제 강남역 테스트: 치킨 프랜차이즈 5곳 전부 매칭 실패, 대신 한정식집은 매칭됨) — `tour`가 `null`인 게 일반적이니 참고용 보조 정보로만 취급.
- 사진은 프론트에 구글 키를 노출하지 않기 위해 `/api/photo`에서 서버가 대신 가져와 스트리밍한다 (`server.js`).
- `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하는 관리자 키이므로 서버(`lib/store.js`)에서만 쓰고 절대 프론트로 내려보내지 않는다.

## 하지 말 것

- 카카오맵/네이버 지도 등 서비스의 오픈API 이외 데이터(별점, 리뷰, 사진, 메뉴 등)를 스크래핑하지 않는다. 카카오 측이 데브톡에서 명시적으로 금지한다고 답변했음 (`MEMORY.md` 참고). 구글도 동일 원칙 적용 — 검색/지도 페이지 직접 크롤링 금지(구글 이용약관 위반). 별점/리뷰수/사진은 구글 Places API(`lib/google.js`), 대표메뉴는 한국관광공사 TourAPI(`lib/tourapi.js`)처럼 공식 오픈API로만 보강한다.

## 정책값 위치

- 반경 확장 단계: `lib/kakao.js`의 `RADIUS_STEPS_M`
- 날씨별 후보 메뉴 테이블: `lib/menu.js`의 `MENU_TABLE`
- 날씨 버킷 분류 기준(강수/기온 임계값): `lib/weather.js`의 `classify()`

## 테스트

- `npm test` (= `test/menu.test.js` + `test/stats.test.js`)로 메뉴 후보 풀 구성 로직과 통계 집계 로직 확인.
