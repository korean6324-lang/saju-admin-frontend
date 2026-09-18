import { createClient } from '@supabase/supabase-js';

// .env 파일에 안전하게 숨겨둔 URL과 퍼블릭 키를 불러옵니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey);