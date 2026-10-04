// src/App.jsx
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard'; 

// 🚨 새롭게 분리 개발한 환전(출금) 정산 컴포넌트 임포트
// (파일 경로가 다를 경우 실제 저장하신 경로로 맞춰주세요)
import AdminExchange from './components/admin/AdminExchange';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          
          {/* 🚨 환전 관리 페이지 전용 라우트 추가 */}
          <Route path="/exchange" element={<AdminExchange />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;