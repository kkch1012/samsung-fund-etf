import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  'https://jolwwjpkawkjbfsjyxhf.supabase.co',
  'sb_publishable_fr3eA-_h3ZIpmXKDnp_8Cw_pZFsbM8y'
);

// 테스트 연결
const { data, error } = await supabase.from('chat_sessions').select('id').limit(1);
if (error && error.code === '42P01') {
  console.log('⚠️  테이블이 없습니다. Supabase Dashboard → SQL Editor에서 아래 SQL을 실행하세요:');
  console.log('');
  console.log(readFileSync(join(__dirname, 'setup-db.sql'), 'utf-8'));
} else if (error) {
  console.log('❌ 연결 에러:', error.message);
} else {
  console.log('✅ DB 연결 성공! chat_sessions 테이블 존재 확인.');
}
