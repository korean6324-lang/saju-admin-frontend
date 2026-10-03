// src/components/admin/AdminAccount.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { Globe, Clock, ShieldCheck, Image as ImageIcon, Users, ExternalLink, ChevronRight, Settings } from 'lucide-react';

export default function AdminAccount({ adminTheme }) {
    // 폼 상태 관리
    const [domain, setDomain] = useState('bokhouse.com');
    const [adminCount, setAdminCount] = useState(0);
    const [loginExpiry, setLoginExpiry] = useState('사용안함');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // 최고관리자 수 페칭
    useEffect(() => {
        const fetchAdminCount = async () => {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'admin');
            if (count !== null) setAdminCount(count);
        };
        fetchAdminCount();
    }, []);

    const handleLogoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // 저장 시뮬레이션
            alert("✅ 계정 및 관리자모드 설정이 성공적으로 저장되었습니다.");
        } catch (error) {
            alert("❌ 설정 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="ios-account-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-account-wrap {
                    width: 100%; box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif;
                    background-color: transparent;
                }

                .ios-page-title {
                    font-size: 28px; font-weight: 800; color: #1C1C1E;
                    margin: 0 0 8px 0; letter-spacing: -0.5px;
                }
                .ios-page-desc { font-size: 14px; color: #8E8E93; margin: 0 0 32px 0; font-weight: 500; }

                /* iOS Inset Grouped 리스트 스타일 */
                .ios-group-title {
                    font-size: 13px; font-weight: 600; color: #8E8E93; text-transform: uppercase;
                    margin: 0 0 8px 16px; letter-spacing: -0.3px;
                }
                .ios-list-group {
                    background-color: #FFFFFF; border-radius: 12px; margin-bottom: 32px;
                    overflow: hidden; border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .ios-list-row {
                    display: flex; align-items: center; justify-content: space-between;
                    min-height: 48px; padding: 14px 16px; border-bottom: 0.5px solid #E5E5EA;
                }
                .ios-list-row:last-child { border-bottom: none; }

                /* 아이콘 및 레이블 영역 */
                .ios-label-wrap { display: flex; align-items: center; gap: 12px; flex: 1; }
                .ios-icon-box {
                    width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #FFFFFF;
                }
                .ios-label { font-size: 16px; font-weight: 500; color: #1C1C1E; letter-spacing: -0.3px; }

                /* 입력 및 상태 표시 영역 */
                .ios-value-wrap { display: flex; align-items: center; gap: 8px; justify-content: flex-end; flex: 2; }
                .ios-value-text { font-size: 16px; color: #8E8E93; font-weight: 400; text-align: right; }
                .ios-value-accent { font-size: 16px; color: #007AFF; font-weight: 600; text-align: right; }
                
                .ios-input-clean {
                    border: none; outline: none; background: transparent; text-align: right;
                    font-size: 16px; color: #007AFF; font-weight: 500; width: 100%; min-width: 0; font-family: inherit;
                }
                .ios-select-clean {
                    border: none; outline: none; background: transparent; text-align: right; direction: rtl;
                    font-size: 16px; color: #007AFF; font-weight: 500; -webkit-appearance: none; appearance: none; font-family: inherit; cursor: pointer;
                }

                /* 액션 및 업로드 버튼 */
                .ios-link-btn {
                    display: flex; align-items: center; gap: 4px; background: #F2F2F7; border: none;
                    color: #007AFF; font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 8px; cursor: pointer;
                }
                .ios-link-btn:active { opacity: 0.7; }
                
                .ios-upload-trigger {
                    display: flex; align-items: center; gap: 6px; color: #007AFF; font-weight: 600; font-size: 15px; cursor: pointer;
                }

                .ios-submit-btn {
                    width: 100%; background-color: #007AFF; color: #FFFFFF; font-size: 17px; font-weight: 600;
                    padding: 16px; border-radius: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.2s, opacity 0.2s;
                    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
                }
                .ios-submit-btn:active:not(:disabled) { transform: scale(0.97); opacity: 0.9; }
                .ios-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
            `}} />

            <div>
                <h1 className="ios-page-title">계정관리</h1>
                <p className="ios-page-desc">도메인 주소, 호스팅 이용 기간, 관리자 모드 설정을 관리합니다.</p>
            </div>

            {/* 1. 계정 정보 섹션 */}
            <div className="ios-group-title">계정 및 라이선스 정보</div>
            <div className="ios-list-group">
                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#007AFF' }}><Globe size={18} /></div>
                        <span className="ios-label">대표 도메인</span>
                    </div>
                    <div className="ios-value-wrap">
                        <input type="text" className="ios-input-clean" value={domain} onChange={(e) => setDomain(e.target.value)} />
                    </div>
                </div>

                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#FF9500' }}><Clock size={18} /></div>
                        <span className="ios-label">사용 기간</span>
                    </div>
                    <div className="ios-value-wrap">
                        <span className="ios-value-text">2026-09-01 만료</span>
                        <span className="ios-value-accent">(350일 남음)</span>
                    </div>
                </div>

                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#34C759' }}><ShieldCheck size={18} /></div>
                        <span className="ios-label">서비스 종류</span>
                    </div>
                    <div className="ios-value-wrap">
                        <span className="ios-value-text" style={{ color: '#1C1C1E', fontWeight: '500' }}>FATE MASTER 엔터프라이즈</span>
                    </div>
                </div>

                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#5856D6' }}><Settings size={18} /></div>
                        <span className="ios-label">운영 상태</span>
                    </div>
                    <div className="ios-value-wrap">
                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#34C759', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34C759' }}></div> 운영중
                        </span>
                        <button className="ios-link-btn" style={{ marginLeft: '8px' }} onClick={() => alert("라이선스 연장 페이지로 이동합니다.")}>
                            <ExternalLink size={14} /> 연장하기
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. 부가 서비스 섹션 */}
            <div className="ios-group-title">라이선스 현황</div>
            <div className="ios-list-group">
                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#FF2D55' }}><Users size={18} /></div>
                        <span className="ios-label">활성화된 최고관리자</span>
                    </div>
                    <div className="ios-value-wrap">
                        <span className="ios-value-text" style={{ color: '#1C1C1E', fontWeight: '700' }}>{adminCount} 명</span>
                    </div>
                </div>
            </div>

            {/* 3. 관리자모드 설정 섹션 */}
            <div className="ios-group-title">관리자모드 UI 설정</div>
            <div className="ios-list-group">
                <div className="ios-list-row" style={{ alignItems: 'flex-start' }}>
                    <div className="ios-label-wrap" style={{ marginTop: '8px' }}>
                        <div className="ios-icon-box" style={{ background: '#00C7AE' }}><ImageIcon size={18} /></div>
                        <span className="ios-label">관리자모드 로고</span>
                    </div>
                    <div className="ios-value-wrap" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                        {logoPreview ? (
                            <img src={logoPreview} alt="Admin Logo" style={{ height: '40px', borderRadius: '8px', border: '0.5px solid #E5E5EA', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ height: '40px', padding: '0 16px', borderRadius: '8px', backgroundColor: '#F2F2F7', display: 'flex', alignItems: 'center', color: '#8E8E93', fontSize: '14px', fontWeight: '500' }}>
                                기본 로고 사용 중
                            </div>
                        )}
                        <label className="ios-upload-trigger">
                            찾아보기
                            <input type="file" accept="image/*" onChange={handleLogoSelect} style={{ display: 'none' }} />
                        </label>
                        <span style={{ fontSize: '12px', color: '#8E8E93', textAlign: 'right', lineHeight: '1.4' }}>
                            권장: 200x51px (PNG, JPG)<br/>저장 버튼을 눌러야 최종 반영됩니다.
                        </span>
                    </div>
                </div>

                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#AF52DE' }}><Clock size={18} /></div>
                        <span className="ios-label">자동 로그아웃 시간</span>
                    </div>
                    <div className="ios-value-wrap">
                        <select className="ios-select-clean" value={loginExpiry} onChange={(e) => setLoginExpiry(e.target.value)}>
                            <option value="사용안함">사용 안 함</option>
                            <option value="30분">동작 없을 시 30분 후</option>
                            <option value="1시간">동작 없을 시 1시간 후</option>
                            <option value="당일자정">매일 자정(00:00)</option>
                        </select>
                        <ChevronRight size={18} color="#C7C7CC" />
                    </div>
                </div>
            </div>

            {/* 하단 저장 버튼 */}
            <button onClick={handleSave} disabled={isSaving} className="ios-submit-btn">
                {isSaving ? <span className="lucide-spin"><Settings size={20}/></span> : <ShieldCheck size={20} />}
                {isSaving ? "설정 적용 중..." : "변경사항 저장"}
            </button>
            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#8E8E93', fontWeight: '500' }}>
                설정 저장 시 어드민 시스템 전체에 즉시 반영됩니다.
            </p>
        </div>
    );
}