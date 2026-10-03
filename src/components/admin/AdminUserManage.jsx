// src/components/admin/AdminUserManage.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Save, X, Edit, ScrollText, ShieldAlert, ChevronRight, UserPlus } from 'lucide-react';

export default function AdminUserManage({ adminTheme }) {
    const queryClient = useQueryClient();

    // 화면 전환 상태: 'list' (목록) | 'form' (추가/수정 폼)
    const [viewMode, setViewMode] = useState('list');
    
    // 유저 개인 장부(포인트 내역) 모달 상태 관리
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // 폼 상태 관리
    const [formData, setFormData] = useState({
        id: '', name: '', password: '', passwordConfirm: '',
        email1: '', email2: '',
        phone1: '02', phone2: '', phone3: '',
        mobile1: '010', mobile2: '', mobile3: '',
        department: '', position: '', memo: '',
        isLoginAllowed: true,
        permissions: { site: true, sms: true, design: true, mobile: true, config: true },
        startPage: '사이트운영'
    });
    
    const [isSaving, setIsSaving] = useState(false);

    // ==========================================================
    // 1. 관리자 리스트 페칭
    // ==========================================================
    const { data: adminUsers = [], isLoading } = useQuery({
        queryKey: ['adminUsersList'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'admin') 
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    // ==========================================================
    // 2. 특정 회원의 포인트(장부) 내역 페칭
    // ==========================================================
    const { data: userHistory = [], isLoading: isLoadingHistory } = useQuery({
        queryKey: ['adminUserHistory', selectedUser?.id],
        queryFn: async () => {
            if (!selectedUser?.id) return [];
            const { data, error } = await supabase
                .from('coin_history')
                .select('*')
                .eq('user_id', selectedUser.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedUser?.id && isHistoryModalOpen
    });

    // ==========================================================
    // 3. 폼 핸들러
    // ==========================================================
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePermissionChange = (key) => {
        setFormData(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
        }));
    };

    const resetForm = () => {
        setFormData({
            id: '', name: '', password: '', passwordConfirm: '', email1: '', email2: '',
            phone1: '02', phone2: '', phone3: '', mobile1: '010', mobile2: '', mobile3: '',
            department: '', position: '', memo: '', isLoginAllowed: true,
            permissions: { site: true, sms: true, design: true, mobile: true, config: true },
            startPage: '사이트운영'
        });
    };

    const handleSave = async () => {
        if (!formData.id || !formData.name || !formData.password) {
            return alert("아이디, 이름, 비밀번호는 필수 입력 항목입니다.");
        }
        if (formData.password !== formData.passwordConfirm) {
            return alert("비밀번호가 일치하지 않습니다.");
        }

        setIsSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // MVP 시뮬레이션
            alert("✅ 관리자 계정이 성공적으로 추가되었습니다.");
            resetForm();
            setViewMode('list');
            queryClient.invalidateQueries(['adminUsersList']);
        } catch (error) {
            alert("❌ 관리자 추가 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="ios-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-wrap {
                    width: 100%; box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif;
                    background-color: transparent;
                }

                .ios-title { font-size: 22px; font-weight: 800; color: #1C1C1E; margin: 0 0 6px 0; letter-spacing: -0.5px; }
                .ios-desc { font-size: 12px; color: #8E8E93; margin: 0 0 24px 0; font-weight: 500; line-height: 1.5; }

                /* 검색 툴바 */
                .ios-toolbar {
                    display: flex; justify-content: space-between; align-items: center;
                    background: #FFFFFF; border-radius: 12px; padding: 10px 16px; margin-bottom: 24px;
                    border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .ios-search-box {
                    display: flex; align-items: center; background: #F2F2F7; border-radius: 8px; padding: 4px 10px; width: 300px;
                }
                .ios-search-input {
                    border: none; background: transparent; outline: none; font-size: 12px; padding: 4px; width: 100%; color: #1C1C1E; font-weight: 500;
                }
                
                /* 미세 버튼 */
                .ios-btn-micro {
                    border: none; background: #F2F2F7; color: #007AFF; font-size: 11px; font-weight: 700;
                    padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;
                }
                .ios-btn-micro:active { transform: scale(0.95); opacity: 0.8; }
                .ios-btn-micro.accent { background: #007AFF; color: #FFFFFF; }
                .ios-btn-micro.outline { background: transparent; border: 1px solid #E5E5EA; color: #1C1C1E; }
                .ios-btn-micro.warning { color: #D97706; background: #FFFBEB; }

                /* iOS 리스트 그룹 */
                .ios-group-title {
                    font-size: 12px; font-weight: 600; color: #8E8E93; text-transform: uppercase;
                    margin: 0 0 6px 12px; letter-spacing: -0.2px;
                }
                .ios-list-group {
                    background-color: #FFFFFF; border-radius: 12px; margin-bottom: 24px;
                    overflow: hidden; border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .ios-list-row {
                    display: flex; align-items: center; justify-content: space-between;
                    min-height: 44px; padding: 12px 16px; border-bottom: 0.5px solid #E5E5EA;
                }
                .ios-list-row:last-child { border-bottom: none; }
                
                /* 폼 요소 */
                .ios-label { font-size: 13px; font-weight: 600; color: #1C1C1E; flex-shrink: 0; width: 110px; }
                .ios-input-clean {
                    flex: 1; min-width: 0; border: none; outline: none; text-align: right;
                    font-size: 13px; color: #007AFF; font-family: inherit; background: transparent; font-weight: 600;
                }
                .ios-input-clean::placeholder { color: #C7C7CC; font-weight: 400; }
                .ios-select-clean {
                    border: none; outline: none; background: transparent; text-align: right; direction: rtl;
                    font-size: 13px; color: #007AFF; font-weight: 600; -webkit-appearance: none; appearance: none; font-family: inherit; cursor: pointer; padding: 0 4px;
                }

                /* iOS 토글 스위치 */
                .ios-toggle {
                    width: 42px; height: 24px; background-color: #E9E9EA; border-radius: 24px; position: relative; cursor: pointer; transition: 0.3s ease; flex-shrink: 0;
                }
                .ios-toggle.active { background-color: #34C759; }
                .ios-toggle-knob {
                    width: 20px; height: 20px; background-color: #FFFFFF; border-radius: 50%; position: absolute; top: 2px; left: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); transition: 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2);
                }
                .ios-toggle.active .ios-toggle-knob { transform: translateX(18px); }

                /* 테이블 스타일 */
                .ios-table { width: 100%; border-collapse: collapse; }
                .ios-th { background-color: #F9F9FB; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #8E8E93; border-bottom: 0.5px solid #E5E5EA; }
                .ios-td { padding: 10px 12px; border-bottom: 0.5px solid #E5E5EA; font-size: 12px; color: #1C1C1E; font-weight: 500; vertical-align: middle; }
                .ios-tr:hover { background-color: #F9F9FB; }

                /* 모달 */
                .ios-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                    display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 20px; animation: fadeIn 0.2s ease-out;
                }
                .ios-modal-card {
                    background: #F2F2F7; width: 100%; max-width: 600px; border-radius: 16px; overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.15); animation: slideUp 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2); display: flex; flex-direction: column; max-height: 85vh;
                }
                .ios-modal-header { padding: 14px 16px; background: #FFFFFF; display: flex; justify-content: space-between; align-items: center; border-bottom: 0.5px solid #E5E5EA; }
                .ios-modal-title { font-size: 14px; font-weight: 700; color: #1C1C1E; margin: 0; display: flex; align-items: center; gap: 6px;}
                .ios-modal-close { background: #F2F2F7; border: none; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #8E8E93; cursor: pointer; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}} />

            {/* 1. 관리자 리스트 화면 */}
            {viewMode === 'list' && (
                <div>
                    <h2 className="ios-title">스태프 및 관리자 현황</h2>
                    <p className="ios-desc">홈페이지 운영을 돕는 스태프 및 관리자 계정을 추가하고 세부 권한을 제어합니다.</p>

                    <div className="ios-toolbar">
                        <div className="ios-search-box">
                            <select className="ios-select-clean" style={{ color: '#1C1C1E', marginRight: '6px', fontSize: '12px' }}>
                                <option>이메일/ID</option>
                                <option>이름</option>
                            </select>
                            <input type="text" className="ios-search-input" placeholder="검색어 입력..." />
                            <Search size={14} color="#8E8E93" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '600' }}>총 <span style={{color: '#007AFF'}}>{adminUsers.length}</span>명</span>
                            <button className="ios-btn-micro accent" onClick={() => setViewMode('form')}><UserPlus size={12}/> 스태프 추가</button>
                        </div>
                    </div>

                    <div className="ios-list-group">
                        <table className="ios-table">
                            <thead>
                                <tr>
                                    <th className="ios-th">번호</th>
                                    <th className="ios-th">이름</th>
                                    <th className="ios-th">아이디 (이메일)</th>
                                    <th className="ios-th" style={{ textAlign: 'center' }}>접속 상태</th>
                                    <th className="ios-th" style={{ textAlign: 'right', paddingRight: '16px' }}>관리 및 내역</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="5" className="ios-td" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>데이터 로딩 중...</td></tr>
                                ) : adminUsers.map((admin, idx) => (
                                    <tr key={admin.id} className="ios-tr">
                                        <td className="ios-td" style={{ color: '#8E8E93', fontSize: '11px' }}>{idx + 1}</td>
                                        <td className="ios-td" style={{ fontWeight: '700' }}>{admin.name || '미설정'}</td>
                                        <td className="ios-td" style={{ color: '#007AFF', fontWeight: '600' }}>{admin.email}</td>
                                        <td className="ios-td" style={{ textAlign: 'center' }}>
                                            <span style={{ background: '#E5FBEB', color: '#34C759', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>정상</span>
                                        </td>
                                        <td className="ios-td" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                <button className="ios-btn-micro outline"><Edit size={10}/> 수정</button>
                                                <button className="ios-btn-micro warning" onClick={() => { setSelectedUser(admin); setIsHistoryModalOpen(true); }}>
                                                    <ScrollText size={10}/> 장부 조회
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 2. 스태프 추가 폼 화면 */}
            {viewMode === 'form' && (
                <div>
                    <h2 className="ios-title">스태프 계정 추가</h2>
                    <p className="ios-desc">새로운 관리자의 기본 정보와 권한을 설정합니다.</p>

                    <div className="ios-group-title">기본 접속 정보</div>
                    <div className="ios-list-group">
                        <div className="ios-list-row">
                            <span className="ios-label">아이디 (이메일)</span>
                            <input type="email" className="ios-input-clean" placeholder="admin@example.com" value={formData.id} onChange={e=>handleInputChange('id', e.target.value)} />
                        </div>
                        <div className="ios-list-row">
                            <span className="ios-label">이름</span>
                            <input type="text" className="ios-input-clean" placeholder="이름 입력" value={formData.name} onChange={e=>handleInputChange('name', e.target.value)} />
                        </div>
                        <div className="ios-list-row">
                            <span className="ios-label">비밀번호</span>
                            <input type="password" className="ios-input-clean" placeholder="8자리 이상 영문/숫자" value={formData.password} onChange={e=>handleInputChange('password', e.target.value)} />
                        </div>
                        <div className="ios-list-row">
                            <span className="ios-label">비밀번호 확인</span>
                            <input type="password" className="ios-input-clean" placeholder="비밀번호 재입력" value={formData.passwordConfirm} onChange={e=>handleInputChange('passwordConfirm', e.target.value)} />
                        </div>
                    </div>

                    <div className="ios-group-title">인적 정보 및 부서</div>
                    <div className="ios-list-group">
                        <div className="ios-list-row">
                            <span className="ios-label">연락처</span>
                            <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'flex-end' }}>
                                <select className="ios-select-clean" style={{ width: '50px' }} value={formData.mobile1} onChange={e=>handleInputChange('mobile1', e.target.value)}><option>010</option><option>011</option></select>
                                <span style={{ color: '#C7C7CC' }}>-</span>
                                <input type="text" className="ios-input-clean" style={{ width: '40px', flex: 'none' }} value={formData.mobile2} onChange={e=>handleInputChange('mobile2', e.target.value)} />
                                <span style={{ color: '#C7C7CC' }}>-</span>
                                <input type="text" className="ios-input-clean" style={{ width: '40px', flex: 'none' }} value={formData.mobile3} onChange={e=>handleInputChange('mobile3', e.target.value)} />
                            </div>
                        </div>
                        <div className="ios-list-row">
                            <span className="ios-label">소속 (부서)</span>
                            <input type="text" className="ios-input-clean" placeholder="예: 디자인팀, 기획실" value={formData.department} onChange={e=>handleInputChange('department', e.target.value)} />
                        </div>
                        <div className="ios-list-row">
                            <span className="ios-label">직급</span>
                            <input type="text" className="ios-input-clean" placeholder="예: 대리, 과장" value={formData.position} onChange={e=>handleInputChange('position', e.target.value)} />
                        </div>
                    </div>

                    <div className="ios-group-title">시스템 권한 제어</div>
                    <div className="ios-list-group">
                        <div className="ios-list-row">
                            <span className="ios-label">로그인 허용</span>
                            <div className={`ios-toggle ${formData.isLoginAllowed ? 'active' : ''}`} onClick={() => handleInputChange('isLoginAllowed', !formData.isLoginAllowed)}>
                                <div className="ios-toggle-knob"></div>
                            </div>
                        </div>
                        {Object.entries({ site: '사이트 전체 관리', sms: 'SMS / 알림톡 발송', design: 'UI / 디자인 편집', mobile: '모바일 환경 설정', config: '코어 환경 설정' }).map(([key, label]) => (
                            <div className="ios-list-row" key={key}>
                                <span className="ios-label" style={{ fontWeight: '500' }}>{label}</span>
                                <div className={`ios-toggle ${formData.permissions[key] ? 'active' : ''}`} onClick={() => handlePermissionChange(key)}>
                                    <div className="ios-toggle-knob"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', paddingBottom: '40px' }}>
                        <button className="ios-btn-micro outline" style={{ flex: 1, padding: '14px', fontSize: '14px' }} onClick={() => { setViewMode('list'); resetForm(); }}>취소</button>
                        <button className="ios-btn-micro accent" style={{ flex: 2, padding: '14px', fontSize: '14px' }} onClick={handleSave} disabled={isSaving}>
                            {isSaving ? '생성 중...' : '계정 생성 완료'}
                        </button>
                    </div>
                </div>
            )}

            {/* 3. 코인/포인트 내역 조회 모달 */}
            {isHistoryModalOpen && selectedUser && (
                <div className="ios-modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
                    <div className="ios-modal-card" onClick={e => e.stopPropagation()}>
                        
                        <div className="ios-modal-header">
                            <h3 className="ios-modal-title"><ScrollText size={16} color="#D97706" /> {selectedUser.name || selectedUser.email}님의 장부 내역</h3>
                            <button className="ios-modal-close" onClick={() => setIsHistoryModalOpen(false)}><X size={14}/></button>
                        </div>

                        <div style={{ padding: '0', overflowY: 'auto', flex: 1, backgroundColor: '#FFFFFF' }}>
                            <table className="ios-table" style={{ borderTop: 'none' }}>
                                <thead>
                                    <tr>
                                        <th className="ios-th">일시</th>
                                        <th className="ios-th">구분</th>
                                        <th className="ios-th">상세 내역</th>
                                        <th className="ios-th" style={{ textAlign: 'right', paddingRight: '16px' }}>변동액</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingHistory ? (
                                        <tr><td colSpan="4" className="ios-td" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>장부 기록을 동기화 중입니다...</td></tr>
                                    ) : userHistory.length > 0 ? (
                                        userHistory.map(tx => {
                                            const isPlus = tx.amount > 0;
                                            return (
                                                <tr key={tx.id} className="ios-tr">
                                                    <td className="ios-td" style={{ fontSize: '10px', color: '#8E8E93' }}>{new Date(tx.created_at).toLocaleString()}</td>
                                                    <td className="ios-td" style={{ fontSize: '11px', fontWeight: '700', color: isPlus ? '#34C759' : '#FF3B30' }}>
                                                        {tx.trade_type === 'sell' ? '수익' : tx.trade_type === 'charge' ? '충전' : tx.trade_type === 'buy' ? '차감' : '변동'}
                                                    </td>
                                                    <td className="ios-td" style={{ color: '#1C1C1E' }}>{tx.description}</td>
                                                    <td className="ios-td" style={{ textAlign: 'right', paddingRight: '16px', fontWeight: '700', color: isPlus ? '#34C759' : '#FF3B30' }}>
                                                        {isPlus ? '+' : ''}{tx.amount.toLocaleString()} C
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr><td colSpan="4" className="ios-td" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>거래 내역이 존재하지 않습니다.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}