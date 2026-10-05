// src/App.jsx (어드민 프로젝트)
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 
import { supabase } from './api/supabaseClient'; // 🚨 Supabase 클라이언트 임포트 추가

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard'; 

const queryClient = new QueryClient();

function App() {
  
  // 🚨 관리자 앱 로그인 시에도 접속 IP와 로그를 수집하도록 추가
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 로그인(SIGNED_IN) 이벤트가 발생하고, 세션 유저 정보가 있을 때만 실행
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          // IP 가져오기
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          const userAgent = navigator.userAgent; 
          
          // 1. 프로필 테이블에 최근 접속 IP 단일 업데이트
          await supabase.from('profiles')
            .update({ 
              last_login_ip: ipData.ip,
              last_login_at: new Date().toISOString()
            })
            .eq('id', session.user.id);

          // 2. 어드민 페이지에서 보이도록 접속 로그(access_logs) 테이블에 추가 (누적)
          await supabase.from('access_logs').insert([{
            user_id: session.user.id,
            ip_address: ipData.ip,
            user_agent: userAgent
          }]);

        } catch (err) {
          console.error('접속 IP 수집 실패:', err);
          
          // IP 추적이 차단된 브라우저 환경에서도 접속 시간은 기록
          await supabase.from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', session.user.id);
          
          // IP 수집 실패 시에도 알 수 없음으로 로그를 남김
          await supabase.from('access_logs').insert([{
            user_id: session.user.id,
            ip_address: 'Unknown (Blocked)',
            user_agent: navigator.userAgent
          }]);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;