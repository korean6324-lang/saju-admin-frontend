// src/App.jsx (어드민 프로젝트)
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 
import { supabase } from './api/supabaseClient'; // 🚨 Supabase 클라이언트 임포트 추가

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard'; 

const queryClient = new QueryClient();

function App() {
  
  useEffect(() => {
    // 🚨 1. IP 수집 전용 함수 (세션 스토리지 활용으로 서버 과부하 방지)
    const logIP = async (user) => {
      // 해당 브라우저 탭에서 이미 한 번 기록했다면 패스
      if (sessionStorage.getItem('admin_ip_logged')) return;
      sessionStorage.setItem('admin_ip_logged', 'true');

      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        const userAgent = navigator.userAgent; 
        
        // 1) 프로필 테이블 업데이트
        await supabase.from('profiles')
          .update({ 
            last_login_ip: ipData.ip,
            last_login_at: new Date().toISOString()
          })
          .eq('id', user.id);

        // 2) 접속 로그 테이블에 추가 (누적)
        await supabase.from('access_logs').insert([{
          user_id: user.id,
          ip_address: ipData.ip,
          user_agent: userAgent
        }]);

      } catch (err) {
        console.error('접속 IP 수집 실패:', err);
        
        // IP 추적이 차단된 브라우저 환경에서도 접속 시간은 기록
        await supabase.from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);
        
        // IP 수집 실패 시에도 알 수 없음으로 로그를 남김
        await supabase.from('access_logs').insert([{
          user_id: user.id,
          ip_address: 'Unknown (Blocked)',
          user_agent: navigator.userAgent
        }]);
      }
    };

    // 🚨 2. 앱 진입/새로고침 시 현재 세션이 살아있다면 즉시 IP 수집 (로그아웃 안 해도 됨!)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        logIP(session.user);
      }
    });

    // 🚨 3. 신규 로그인/로그아웃 이벤트 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // 새 로그인 시 무조건 다시 수집하도록 플래그 리셋
        sessionStorage.removeItem('admin_ip_logged');
        logIP(session.user);
      }
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('admin_ip_logged');
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