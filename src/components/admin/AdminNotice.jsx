// src/components/admin/AdminNotice.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { Send, Search, Trash2, CheckCircle2, Bell, MessageSquare, Megaphone, Loader2 } from 'lucide-react';

export default function AdminNotice({ session }) {
    const queryClient = useQueryClient();

    // ==========================================================
    // 1. 발송 라우팅 및 폼 상태 (확장성 고려)
    // ==========================================================
    // msgType: 'notice'(공지사항) | 'alert'(알림톡/푸시) | 'message'(쪽지)
    const [msgType, setMsgType] = useState('notice'); 
    // targetType: 'all'(전체) | 'role'(특정 등급) | 'individual'(개별)
    const [targetType, setTargetType] = useState('all'); 
    const [targetRole, setTargetRole] = useState('user'); // 'user', 'partner', 'vip'

    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeContent, setNoticeContent] = useState('');
    const [noticeFontSize, setNoticeFontSize] = useState('13px');
    const [noticeFontFamily, setNoticeFontFamily] = useState('inherit');
    const [isSaving, setIsSaving] = useState(false);

    // 검색 및 타겟 유저 상태 (개별 발송용)
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [searchedUsers, setSearchedUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUserEmail, setSelectedUserEmail] = useState('');

    // ==========================================================
    // 2. 데이터 페칭 (공지사항 목록)
    // ==========================================================
    const { data: globalNotices = [], isLoading: isLoadingNotices } = useQuery({
        queryKey: ['globalNotices'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('global_notices')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // ==========================================================
    // 3. 디바운스 서버사이드 유저 검색 (개별 쪽지용)
    // ==========================================================
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (userSearchTerm.length < 2) {
                setSearchedUsers([]);
                return;
            }
            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .ilike('email', `%${userSearchTerm}%`)
                    .limit(10);
                if (!error && data) setSearchedUsers(data);
            } catch (err) { console.error(err); } 
            finally { setIsSearching(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [userSearchTerm]);

    // ==========================================================
    // 4. 중앙 제어 발송 처리기 (Gateway)
    // ==========================================================
    const handleSend = async () => {
        if (!noticeTitle || !noticeContent) return alert("제목과 내용을 모두 입력해주세요.");
        setIsSaving(true);
        
        try {
            // [A] 전체 공지사항 등록 파이프라인
            if (msgType === 'notice') {
                const { error } = await supabase.from('global_notices').insert([{
                    title: noticeTitle,
                    content: noticeContent,
                    type: 'notice',
                    is_active: true,
                    font_size: noticeFontSize,
                    font_family: noticeFontFamily
                }]);
                if (error) throw error;
                alert("✅ 전체 공지사항이 사이트에 게시되었습니다.");
                queryClient.invalidateQueries(['globalNotices']);
            } 
            
            // [B] 알림 및 쪽지 발송 파이프라인 (확장성 설계)
            else {
                if (targetType === 'individual') {
                    if (!selectedUserId) return alert("발송할 특정 회원을 검색하여 선택해주세요.");
                    const { error } = await supabase.from('user_messages').insert([{
                        user_id: selectedUserId,
                        title: noticeTitle,
                        content: noticeContent,
                        is_read: false,
                        font_size: noticeFontSize,
                        font_family: noticeFontFamily
                    }]);
                    if (error) throw error;
                    alert(`✅ [${selectedUserEmail}] 님에게 개별 발송이 완료되었습니다.`);
                } 
                else if (targetType === 'role' || targetType === 'all') {
                    // 🚨 단체 알림톡 발송은 대용량 트랜잭션이므로 향후 Edge Function 연결 시 이 곳에서 처리
                    alert(`🚀 [시스템 메시지]\n'${targetType === 'all' ? '전체' : targetRole}' 대상 대량 단체 발송 모듈(API) 연동이 준비된 상태입니다.\n(다음 마일스톤에서 대용량 큐 처리 백엔드 연결 예정)`);
                }
            }
            
            // 폼 초기화
            setNoticeTitle(''); setNoticeContent('');
            setUserSearchTerm(''); setSelectedUserId(null); setSelectedUserEmail('');
            
        } catch (error) {
            console.error("발송 오류:", error);
            alert(`❌ 처리 중 시스템 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNotice = async (id) => {
        if (!window.confirm("공지를 삭제하시겠습니까?")) return;
        const { error } = await supabase.from('global_notices').delete().eq('id', id);
        if (!error) queryClient.invalidateQueries(['globalNotices']);
    };

    return (
        <div className="ios-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-wrap {
                    width: 100%; box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif;
                    background-color: transparent;
                }

                .ios-title { font-size: 24px; font-weight: 800; color: #1C1C1E; margin: 0 0 6px 0; letter-spacing: -0.5px; }
                .ios-desc { font-size: 13px; color: #8E8E93; margin: 0 0 24px 0; font-weight: 500; }

                /* Segment Controls */
                .ios-segment {
                    display: inline-flex; background-color: #E5E5EA; border-radius: 8px; padding: 2px; margin-bottom: 24px;
                }
                .ios-segment-btn {
                    padding: 8px 14px; font-size: 13px; font-weight: 600; color: #8E8E93;
                    border-radius: 6px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px;
                }
                .ios-segment-btn.active { background-color: #FFFFFF; color: #1C1C1E; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
                .ios-segment-btn.active.notice { color: #007AFF; }
                .ios-segment-btn.active.alert { color: #FF9500; }
                .ios-segment-btn.active.message { color: #34C759; }

                /* iOS Inset Grouped 리스트 스타일 */
                .ios-group-title {
                    font-size: 12px; font-weight: 600; color: #8E8E93; text-transform: uppercase;
                    margin: 0 0 6px 16px; letter-spacing: -0.2px;
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
                .ios-label { font-size: 13px; font-weight: 600; color: #1C1C1E; flex-shrink: 0; width: 120px; }
                .ios-value-wrap { display: flex; align-items: center; justify-content: flex-end; flex: 1; min-width: 0; gap: 8px; flex-wrap: wrap; }
                
                .ios-input-clean {
                    flex: 1; min-width: 0; border: none; outline: none; text-align: right;
                    font-size: 14px; color: #007AFF; font-family: inherit; background: transparent; font-weight: 600;
                }
                .ios-input-clean::placeholder { color: #C7C7CC; font-weight: 400; }
                
                .ios-select-clean {
                    border: none; outline: none; background: transparent; text-align: right; direction: rtl;
                    font-size: 13px; color: #007AFF; font-weight: 600; -webkit-appearance: none; appearance: none; font-family: inherit; cursor: pointer; padding: 0 4px;
                }

                /* 검색 드롭다운 */
                .ios-search-dropdown {
                    position: absolute; top: 100%; right: 0; width: 280px; max-height: 200px; overflow-y: auto;
                    background-color: #FFFFFF; border: 0.5px solid #C6C6C8; border-radius: 12px; z-index: 10;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12); margin-top: 4px; padding: 4px;
                }
                .ios-search-item {
                    padding: 10px 12px; border-radius: 8px; font-size: 13px; color: #1C1C1E; cursor: pointer; text-align: left;
                }
                .ios-search-item:hover { background-color: #F2F2F7; }

                /* 버튼 */
                .ios-btn-micro {
                    border: none; background: #F2F2F7; color: #007AFF; font-size: 12px; font-weight: 700;
                    padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;
                }
                .ios-btn-micro:active { transform: scale(0.95); opacity: 0.8; }
                .ios-btn-micro.danger { color: #FF3B30; background: #FFE5E5; }
                .ios-btn-micro.emoji { font-size: 14px; background: transparent; padding: 4px; }

                .ios-submit-btn {
                    width: 100%; background-color: #007AFF; color: #FFFFFF; font-size: 16px; font-weight: 700;
                    padding: 16px; border-radius: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.2s, opacity 0.2s;
                    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2); margin-top: 8px; margin-bottom: 40px;
                }
                .ios-submit-btn:active:not(:disabled) { transform: scale(0.98); opacity: 0.9; }
                .ios-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

                /* 테이블 스타일 */
                .ios-table-wrap {
                    background-color: #FFFFFF; border-radius: 12px; overflow: hidden;
                    border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .ios-table { width: 100%; border-collapse: collapse; }
                .ios-th { background-color: #F9F9FB; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #8E8E93; border-bottom: 0.5px solid #E5E5EA; }
                .ios-td { padding: 14px 16px; border-bottom: 0.5px solid #E5E5EA; font-size: 13px; color: #1C1C1E; font-weight: 500; vertical-align: middle; }
                .ios-tr:last-child .ios-td { border-bottom: none; }
                .ios-tr:hover { background-color: #F9F9FB; }

                .lucide-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />

            <div>
                <h2 className="ios-title">고객센터 통합 관리</h2>
                <p className="ios-desc">공지사항을 등록하거나, 특정 유저 및 그룹에게 앱 알림/쪽지를 발송합니다.</p>
            </div>

            {/* 발송 유형 선택 (Segment) */}
            <div className="ios-segment">
                <div className={`ios-segment-btn ${msgType === 'notice' ? 'active notice' : ''}`} onClick={() => { setMsgType('notice'); setTargetType('all'); }}>
                    <Megaphone size={14}/> 사이트 전체 공지
                </div>
                <div className={`ios-segment-btn ${msgType === 'alert' ? 'active alert' : ''}`} onClick={() => setMsgType('alert')}>
                    <Bell size={14}/> 알림톡/앱 푸시
                </div>
                <div className={`ios-segment-btn ${msgType === 'message' ? 'active message' : ''}`} onClick={() => setMsgType('message')}>
                    <MessageSquare size={14}/> 마이페이지 쪽지
                </div>
            </div>

            <div className="ios-group-title">메시지 설정 및 내용 작성</div>
            <div className="ios-list-group">
                
                {/* 수신 타겟 설정 (공지사항이 아닐 때만 노출) */}
                {msgType !== 'notice' && (
                    <div className="ios-list-row" style={{ backgroundColor: '#F9F9FB' }}>
                        <span className="ios-label">수신 그룹 설정</span>
                        <div className="ios-value-wrap">
                            <select className="ios-select-clean" style={{ color: '#1C1C1E' }} value={targetType} onChange={(e) => setTargetType(e.target.value)}>
                                <option value="all">전체 회원 (대량 발송)</option>
                                <option value="role">특정 등급 단체 발송</option>
                                <option value="individual">특정 유저 1명 선택</option>
                            </select>
                            {targetType === 'role' && (
                                <select className="ios-select-clean" style={{ color: '#007AFF' }} value={targetRole} onChange={e=>setTargetRole(e.target.value)}>
                                    <option value="user">일반 무료 회원</option>
                                    <option value="partner">스토어 파트너</option>
                                    <option value="vip">VIP 구독 회원</option>
                                </select>
                            )}
                        </div>
                    </div>
                )}

                {/* 개별 유저 검색창 (개별선택일 때만 노출) */}
                {msgType !== 'notice' && targetType === 'individual' && (
                    <div className="ios-list-row" style={{ position: 'relative' }}>
                        <span className="ios-label">대상 유저 검색</span>
                        <div className="ios-value-wrap">
                            {selectedUserId ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#34C759', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> {selectedUserEmail}</span>
                                    <button className="ios-btn-micro outline" onClick={() => { setSelectedUserId(null); setUserSearchTerm(''); }}>다시 검색</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', background: '#F2F2F7', borderRadius: '8px', padding: '4px 10px', width: '240px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="이메일을 입력하세요..." 
                                        value={userSearchTerm}
                                        onChange={(e) => { setUserSearchTerm(e.target.value); setShowUserDropdown(true); }}
                                        onFocus={() => setShowUserDropdown(true)}
                                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }}
                                    />
                                    <Search size={14} color="#8E8E93" />
                                </div>
                            )}
                        </div>

                        {showUserDropdown && userSearchTerm.length >= 2 && !selectedUserId && (
                            <div className="ios-search-dropdown">
                                {isSearching ? (
                                    <div style={{ padding: '12px', color: '#8E8E93', fontSize: '12px', textAlign: 'center' }}>조회 중...</div>
                                ) : searchedUsers.length > 0 ? (
                                    searchedUsers.map(u => (
                                        <div 
                                            key={u.id} className="ios-search-item"
                                            onClick={() => { setSelectedUserId(u.id); setSelectedUserEmail(u.email); setUserSearchTerm(u.email); setShowUserDropdown(false); }}
                                        >
                                            {u.email}
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '12px', color: '#8E8E93', fontSize: '12px', textAlign: 'center' }}>검색 결과 없음</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 메인 폼 */}
                <div className="ios-list-row">
                    <span className="ios-label">메시지 제목</span>
                    <input type="text" className="ios-input-clean" placeholder="제목을 입력하세요." value={noticeTitle} onChange={e=>setNoticeTitle(e.target.value)} />
                </div>

                <div className="ios-list-row">
                    <span className="ios-label">스타일 및 이모지</span>
                    <div className="ios-value-wrap">
                        <select className="ios-select-clean" value={noticeFontFamily} onChange={e=>setNoticeFontFamily(e.target.value)}>
                            <option value="inherit">고딕체</option>
                            <option value="'Noto Serif KR', serif">전통 명조체</option>
                        </select>
                        <select className="ios-select-clean" value={noticeFontSize} onChange={e=>setNoticeFontSize(e.target.value)}>
                            <option value="13px">보통 (13px)</option>
                            <option value="16px">크게 (16px)</option>
                        </select>
                        <div style={{ width: '1px', height: '12px', background: '#E5E5EA', margin: '0 4px' }}></div>
                        <div style={{ display: 'flex' }}>
                            {['📢', '🎉', '⚠️', '💖', '🎁'].map(icon => (
                                <button key={icon} className="ios-btn-micro emoji" onClick={() => setNoticeContent(p => p + icon)}>{icon}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="ios-list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px', borderBottom: 'none' }}>
                    <textarea 
                        value={noticeContent} 
                        onChange={e=>setNoticeContent(e.target.value)} 
                        placeholder="전달하실 상세 내용을 작성해주세요."
                        style={{ width: '100%', minHeight: '160px', padding: '16px', border: '1px solid #E5E5EA', borderRadius: '12px', outline: 'none', resize: 'vertical', fontSize: noticeFontSize, fontFamily: noticeFontFamily, boxSizing: 'border-box', background: '#F9F9FB', color: '#1C1C1E', lineHeight: '1.6' }} 
                    />
                </div>
            </div>

            <button onClick={handleSend} disabled={isSaving} className="ios-submit-btn">
                {isSaving ? <Loader2 size={18} className="lucide-spin" /> : <Send size={18} />}
                {isSaving ? "데이터 발송 중..." : (msgType === 'notice' ? "전체 공지사항 게시하기" : "대상에게 알림/쪽지 발송하기")}
            </button>


            {/* 3. 공지사항 데이터 테이블 */}
            <div className="ios-group-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>게시 중인 전체 공지사항 ({globalNotices.length})</span>
                <span style={{ fontSize: '11px', textTransform: 'none', fontWeight: '500' }}>※ 개별 발송된 쪽지 내역은 유저 상세 관리에서 확인하세요.</span>
            </div>

            <div className="ios-table-wrap">
                <table className="ios-table">
                    <thead>
                        <tr>
                            <th className="ios-th">일시</th>
                            <th className="ios-th">공지 제목</th>
                            <th className="ios-th" style={{ textAlign: 'center' }}>상태</th>
                            <th className="ios-th" style={{ textAlign: 'right', paddingRight: '16px' }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoadingNotices ? (
                            <tr><td colSpan="4" className="ios-td" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>데이터 로딩 중...</td></tr>
                        ) : globalNotices.length === 0 ? (
                            <tr><td colSpan="4" className="ios-td" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>등록된 공지사항이 없습니다.</td></tr>
                        ) : (
                            globalNotices.map((notice) => (
                                <tr key={notice.id} className="ios-tr">
                                    <td className="ios-td" style={{ color: '#8E8E93', fontSize: '11px' }}>
                                        {new Date(notice.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="ios-td" style={{ fontWeight: '700', color: '#1C1C1E' }}>
                                        {notice.title}
                                    </td>
                                    <td className="ios-td" style={{ textAlign: 'center' }}>
                                        {notice.is_active ? (
                                            <span style={{ background: '#E5FBEB', color: '#34C759', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>게시중</span>
                                        ) : (
                                            <span style={{ background: '#F2F2F7', color: '#8E8E93', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>숨김</span>
                                        )}
                                    </td>
                                    <td className="ios-td" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                        <button className="ios-btn-micro danger" onClick={() => handleDeleteNotice(notice.id)}>
                                            <Trash2 size={12}/> 삭제
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}