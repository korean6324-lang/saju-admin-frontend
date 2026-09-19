// src/App.jsx
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard'; 

// 🚨 1. 새로 생성된 컴포넌트 및 supabase 불러오기
import AdminSidebar from './components/admin/AdminSidebar';
import AdminMyeongdang from './components/admin/AdminMyeongdang';
import AdminMyeongdangRequests from './components/admin/AdminMyeongdangRequests';
import { supabase } from './api/supabaseClient';

const queryClient = new QueryClient();

// 🚨 2. 관리자 화면 레이아웃 컴포넌트 (좌측 사이드바 + 우측 컨텐츠 영역)
function AdminLayout() {
    const [session, setSession] = useState(null);

    // 사이드바 레이아웃 내부에서 관리자 세션을 유지합니다.
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F3F4F6' }}>
            {/* 좌측 사이드바 고정 */}
            <AdminSidebar />
            
            {/* 우측 컨텐츠 영역 (메뉴 클릭 시 이 부분이 바뀝니다) */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <Outlet context={{ session }} />
            </div>
        </div>
    );
}

// 🚨 3. AdminMyeongdang 컴포넌트가 session Props를 받도록 연결해 주는 징검다리
function MyeongdangRoute() {
    const { session } = useOutletContext();
    return <AdminMyeongdang session={session} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* 기존 라우트 유지 */}
          <Route path="/" element={<AdminLogin />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          
          {/* 🚨 4. 신규 통합 어드민 라우트 연결 */}
          <Route path="/admin" element={<AdminLayout />}>
              <Route path="myeongdang" element={<MyeongdangRoute />} />
              <Route path="myeongdang-requests" element={<AdminMyeongdangRequests />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;