// src/App.jsx
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // 🚨 1. 라이브러리 불러오기

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard'; 

// 🚨 2. React Query 설정 객체 생성 (앱 전체에서 1개만 존재해야 함)
const queryClient = new QueryClient();

function App() {
  return (
    // 🚨 3. 앱 전체를 QueryClientProvider로 감싸주기
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          {/* 설정되지 않은 이상한 주소로 접속하면 무조건 로그인 화면으로 쫓아냅니다 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;