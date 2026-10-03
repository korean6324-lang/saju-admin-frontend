// src/pages/AdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { ShieldCheck, Loader2 } from 'lucide-react';

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
        <div className="ios-login-bg">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-login-bg {
                    min-height: 100vh;
                    background-color: #F2F2F7; /* iOS 고유의 밝은 회색 배경 */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif;
                }
                
                .ios-login-card {
                    background-color: #FFFFFF;
                    width: 100%;
                    max-width: 360px;
                    border-radius: 24px;
                    padding: 40px 24px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
                    text-align: center;
                    animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .ios-logo-box {
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #007AFF 0%, #0056D2 100%);
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px auto;
                    box-shadow: 0 8px 16px rgba(0, 122, 255, 0.2);
                }

                .ios-title {
                    font-size: 24px;
                    font-weight: 800;
                    color: #1C1C1E;
                    letter-spacing: -0.5px;
                    margin: 0 0 6px 0;
                }

                .ios-subtitle {
                    font-size: 14px;
                    color: #8E8E93;
                    font-weight: 500;
                    margin: 0 0 32px 0;
                    letter-spacing: -0.3px;
                }

                .ios-input-group {
                    text-align: left;
                    margin-bottom: 16px;
                }

                .ios-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #8E8E93;
                    margin-bottom: 8px;
                    padding-left: 4px;
                }

                .ios-input {
                    width: 100%;
                    box-sizing: border-box;
                    background-color: #F2F2F7;
                    border: 1.5px solid transparent;
                    border-radius: 14px;
                    padding: 16px;
                    font-size: 16px;
                    color: #1C1C1E;
                    font-weight: 500;
                    outline: none;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }

                .ios-input::placeholder {
                    color: #C7C7CC;
                }

                .ios-input:focus {
                    background-color: #FFFFFF;
                    border-color: #007AFF;
                    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
                }

                .ios-submit-btn {
                    width: 100%;
                    background-color: #007AFF;
                    color: #FFFFFF;
                    font-size: 17px;
                    font-weight: 600;
                    border: none;
                    border-radius: 14px;
                    padding: 16px;
                    margin-top: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: transform 0.2s cubic-bezier(0.2, 0.85, 0.32, 1.2), background-color 0.2s;
                }

                .ios-submit-btn:active:not(:disabled) {
                    transform: scale(0.96);
                    background-color: #0062CC;
                }

                .ios-submit-btn:disabled {
                    background-color: #A1C6F6;
                    cursor: not-allowed;
                    transform: none;
                }

                .lucide-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />

            <div className="ios-login-card">
                <div className="ios-logo-box">
                    <ShieldCheck size={32} color="#FFFFFF" strokeWidth={2.5} />
                </div>
                
                <h1 className="ios-title">
                    FATE MASTER
                </h1>
                <p className="ios-subtitle">관리자 시스템 로그인</p>

                <form onSubmit={handleLogin}>
                    <div className="ios-input-group">
                        <label className="ios-label">관리자 이메일</label>
                        <input 
                            type="email" 
                            className="ios-input"
                            placeholder="admin@example.com"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <div className="ios-input-group">
                        <label className="ios-label">비밀번호</label>
                        <input 
                            type="password" 
                            className="ios-input"
                            placeholder="••••••••"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>

                    <button type="submit" className="ios-submit-btn" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="lucide-spin" />
                                인증 중...
                            </>
                        ) : (
                            '로그인'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}