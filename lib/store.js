// Supabase(app_store 테이블)에 위치 정보 + 메뉴 히스토리를 저장하는 단일 창구
// Vercel 서버리스 환경은 파일시스템이 읽기 전용이라 로컬 파일 대신 DB를 사용한다.
const { createClient } = require('@supabase/supabase-js');

const ROW_ID = 1;
const EMPTY = { address: null, lat: null, lng: null, history: [] };

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function load() {
  const { data, error } = await supabase
    .from('app_store')
    .select('data')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (error || !data) return EMPTY;
  return data.data;
}

async function save(data) {
  const { error } = await supabase.from('app_store').upsert({ id: ROW_ID, data });
  if (error) throw error;
}

module.exports = { load, save };
