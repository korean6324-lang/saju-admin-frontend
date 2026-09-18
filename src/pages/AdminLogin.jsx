import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Supabase 로그인 시도
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            // 2. 관리자 권한(role) 검사
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
            
            if (!profile || profile.role !== 'admin') {
                await supabase.auth.signOut();
                alert("관리자 권한이 없는 계정입니다.");
                return;
            }

            // 3. 통과 시 대시보드로 이동
            navigate('/dashboard');
        } catch (error) {
            alert("로그인 실패: 이메일과 비밀번호를 다시 확인해주세요.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F3F4F6' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#111827' }}>
                        <span style={{ color: '#2563EB' }}>FATE MASTER</span> ADMIN
                    </h1>
                    <p style={{ marginTop: '8px', fontSize: '14px', color: '#6B7280' }}>관리자 전용 로그인 페이지입니다.</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>관리자 이메일</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>비밀번호</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }} />
                    </div>
                    <button type="submit" disabled={isLoading} style={{ marginTop: '16px', padding: '14px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                        {isLoading ? '인증 중...' : '관리자 로그인'}
                    </button>
                </form>
            </div>
        </div>
    );
}