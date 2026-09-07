# CLAUDE.md

점심 뭐 먹지 추천 앱의 프로젝트 정책입니다.

## 스택

- Node.js + Express 서버(`server.js`) + 정적 프론트(`public/`). 별도 프레임워크/DB 없음.
- 데이터 저장은 `data/store.json` 파일 하나 (위치 + 메뉴 히스토리). DB 아님, 1인용이라 파일로 충분.

## API 키

- `KAKAO_REST_API_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `KMA_SERVICE_KEY`, `GOOGLE_MAPS_API_KEY`는 `.env`에만 저장.
- `.env`는 절대 커밋하지 않음 (`.gitignore`에 포함). 새 키가 필요해지면 `.env.example`에 이름만 추가.
- `KMA_SERVICE_KEY`가 없어도 앱은 동작해야 함 (`lib/weather.js`가 "보통" 버킷으로 폴백).
- `GOOGLE_MAPS_API_KEY`가 없어도 앱은 동작해야 함 (`lib/google.js`가 별점/사진 없이 null 반환). `rating`/`userRatingCount`/`photos` 필드는 Places API Text Search의 Enterprise SKU 과금 대상 — 무료 크레딧 소진 여부를 가끔 확인할 것.
- 사진은 프론트에 구글 키를 노출하지 않기 위해 `/api/photo`에서 서버가 대신 가져와 스트리밍한다 (`server.js`).

## 하지 말 것

- 카카오맵/네이버 지도 등 서비스의 오픈API 이외 데이터(별점, 리뷰, 사진 등)를 스크래핑하지 않는다. 카카오 측이 데브톡에서 명시적으로 금지한다고 답변했음 (`MEMORY.md` 참고). 별점/리뷰수/사진이 필요하면 이를 공식 제공하는 구글 Places API(`lib/google.js`)를 쓴다.
- `data/store.json`을 git에 커밋하지 않는다 (런타임 생성 파일).

## 정책값 위치

- 반경 확장 단계: `lib/kakao.js`의 `RADIUS_STEPS_M`
- 날씨별 후보 메뉴 테이블: `lib/menu.js`의 `MENU_TABLE`
- 날씨 버킷 분류 기준(강수/기온 임계값): `lib/weather.js`의 `classify()`

## 테스트

- `npm test` (= `node test/menu.test.js`)로 메뉴 중복 제외 로직 확인.
