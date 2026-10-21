import { createClient } from '@supabase/supabase-js';

// .env 파일에 안전하게 숨겨둔 URL과 퍼블릭 키를 불러옵니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase 클라이언트 생성 (관리자 로그인 세션 유지용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🛡️ 관리자 직권 자산 지급/차감 및 데이터 관리 전용 클라이언트
// (사용자 세션 토큰 간섭 없이 service_role 권한으로 직접 실행하여 DB 보안 트리거 충돌 방지)
export const adminRpcClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});
