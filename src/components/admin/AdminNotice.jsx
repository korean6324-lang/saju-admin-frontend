// src/components/admin/AdminNotice.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { Headset, Send, Search, Trash2, Users, CheckCircle2, Bell, MessageSquare, Megaphone } from 'lucide-react';

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
                    // 🚨 CTO Note: 단체 쪽지/알림톡 발송은 대량 트랜잭션이 발생하므로
                    // 추후 백엔드 Edge Function(RPC)이나 알림톡 API 연동 시 이곳에 로직이 연결됩니다.
                    alert(`🚀 [시스템 메시지]\n'${targetType === 'all' ? '전체' : targetRole}' 대상 대량 단체 발송 모듈(API) 연동이 준비된 상태입니다.\n(다음 마일스톤에서 대용량 큐(Queue) 처리 백엔드 연결 예정)`);
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

    // ==========================================================
    // 🎨 엔터프라이즈 화이트 테마 스타일 (12~13px 고밀도)
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '24px' },
        
        formBox: { border: '2px solid #E5E7EB', display: 'flex', flexDirection: 'column', marginBottom: '20px' },
        formRow: { display: 'flex', borderBottom: '1px solid #E5E7EB' },
        formLabel: { width: '140px', backgroundColor: '#F9FAFB', padding: '12px 16px', fontWeight: 'bold', color: '#444', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', fontSize: '12px', flexShrink: 0 },
        formContent: { flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', flexWrap: 'wrap' },
        
        input: { padding: '6px 10px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', width: '100%', maxWidth: '500px' },
        select: { padding: '6px 10px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', backgroundColor: '#FFF' },
        radioLabel: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginRight: '8px' },
        
        submitBtn: { backgroundColor: '#0ea5e9', color: '#FFF', border: 'none', padding: '10px 40px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
        
        // 테이블
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '12px' },
        tableCell: { padding: '8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
        
        actionBtnRed: { padding: '4px 8px', border: '1px solid #ef4444', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#ef4444' }
    };

    return (
        <div style={styles.container}>
            {/* 1. 상단 타이틀 */}
            <div>
                <h2 style={styles.headerTitle}>고객센터 통합 관리 (공지 및 발송)</h2>
                <p style={styles.headerSub}>[운영 및 마케팅 &gt; 고객센터] 공지사항을 등록하거나, 특정 유저 및 그룹에게 앱 알림/쪽지를 발송합니다.</p>
            </div>

            {/* 2. 꽉 찬 표 형태의 통합 등록 폼 (Whois 스타일) */}
            <div style={styles.formBox}>
                
                {/* 발송 유형 선택 */}
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 업무(발송) 유형</div>
                    <div style={styles.formContent}>
                        <label style={styles.radioLabel}>
                            <input type="radio" checked={msgType === 'notice'} onChange={() => { setMsgType('notice'); setTargetType('all'); }} />
                            <Megaphone size={14} style={{color: '#0ea5e9'}}/> 전체 공지사항 (홈 노출)
                        </label>
                        <span style={{color: '#CCC'}}>|</span>
                        <label style={styles.radioLabel}>
                            <input type="radio" checked={msgType === 'alert'} onChange={() => setMsgType('alert')} />
                            <Bell size={14} style={{color: '#d97706'}}/> 앱 푸시/알림톡
                        </label>
                        <span style={{color: '#CCC'}}>|</span>
                        <label style={styles.radioLabel}>
                            <input type="radio" checked={msgType === 'message'} onChange={() => setMsgType('message')} />
                            <MessageSquare size={14} style={{color: '#059669'}}/> 마이페이지 쪽지
                        </label>
                    </div>
                </div>

                {/* 수신 대상 선택 (공지사항이 아닐 때만 노출) */}
                {msgType !== 'notice' && (
                    <div style={{...styles.formRow, backgroundColor: '#fefce8'}}>
                        <div style={styles.formLabel}>· 수신 타겟 설정</div>
                        <div style={styles.formContent}>
                            <label style={styles.radioLabel}>
                                <input type="radio" checked={targetType === 'all'} onChange={() => setTargetType('all')} />
                                서비스 전체 회원 (대량발송)
                            </label>
                            <label style={styles.radioLabel}>
                                <input type="radio" checked={targetType === 'role'} onChange={() => setTargetType('role')} />
                                특정 등급 단체발송:
                            </label>
                            {targetType === 'role' && (
                                <select value={targetRole} onChange={e=>setTargetRole(e.target.value)} style={styles.select}>
                                    <option value="user">일반 회원 전체</option>
                                    <option value="partner">스토어 파트너 전체</option>
                                    <option value="vip">VIP 결제회원 전체</option>
                                </select>
                            )}
                            <label style={{...styles.radioLabel, marginLeft: '12px'}}>
                                <input type="radio" checked={targetType === 'individual'} onChange={() => setTargetType('individual')} />
                                특정 유저 개별선택
                            </label>
                        </div>
                    </div>
                )}

                {/* 개별 유저 검색창 (개별선택일 때만 노출) */}
                {msgType !== 'notice' && targetType === 'individual' && (
                    <div style={styles.formRow}>
                        <div style={styles.formLabel}>· 대상 검색 <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                        <div style={styles.formContent}>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${selectedUserId ? '#059669' : '#CCC'}`, backgroundColor: '#FFF' }}>
                                    <Search size={14} color="#999" style={{marginLeft: '8px'}} />
                                    <input 
                                        type="text" 
                                        placeholder="이메일을 두 글자 이상 입력..." 
                                        value={userSearchTerm}
                                        onChange={(e) => {
                                            setUserSearchTerm(e.target.value);
                                            setSelectedUserId(null); 
                                            setShowUserDropdown(true);
                                        }}
                                        onFocus={() => setShowUserDropdown(true)}
                                        style={{ width: '100%', padding: '6px 8px', border: 'none', outline: 'none', fontSize: '12px' }}
                                    />
                                </div>

                                {showUserDropdown && userSearchTerm.length >= 2 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#FFF', border: '1px solid #CCC', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                        {isSearching ? (
                                            <div style={{ padding: '8px', color: '#999', fontSize: '11px' }}>서버 조회 중...</div>
                                        ) : searchedUsers.length > 0 ? (
                                            searchedUsers.map(u => (
                                                <div 
                                                    key={u.id} 
                                                    onClick={() => {
                                                        setSelectedUserId(u.id);
                                                        setSelectedUserEmail(u.email);
                                                        setUserSearchTerm(u.email);
                                                        setShowUserDropdown(false);
                                                    }}
                                                    style={{ padding: '8px', borderBottom: '1px solid #EEE', cursor: 'pointer', fontSize: '12px' }}
                                                >
                                                    {u.email}
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '8px', color: '#999', fontSize: '11px' }}>검색 결과 없음</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {selectedUserId && <span style={{color: '#059669', fontWeight: 'bold'}}><CheckCircle2 size={14} style={{verticalAlign:'middle'}}/> 타겟 확정: {selectedUserEmail}</span>}
                        </div>
                    </div>
                )}

                {/* 제목 */}
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 제목 (Title) <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                    <div style={styles.formContent}>
                        <input type="text" value={noticeTitle} onChange={e=>setNoticeTitle(e.target.value)} placeholder="제목을 입력하세요." style={{...styles.input, maxWidth: '100%'}} />
                    </div>
                </div>

                {/* 서식 및 이모지 */}
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 폰트/스타일</div>
                    <div style={styles.formContent}>
                        <select value={noticeFontFamily} onChange={e=>setNoticeFontFamily(e.target.value)} style={styles.select}>
                            <option value="inherit">기본 고딕체</option>
                            <option value="'Noto Serif KR', serif">전통 명조체</option>
                        </select>
                        <select value={noticeFontSize} onChange={e=>setNoticeFontSize(e.target.value)} style={styles.select}>
                            <option value="13px">보통 (13px)</option>
                            <option value="16px">크게 (16px)</option>
                        </select>
                        <span style={{color: '#CCC', margin: '0 4px'}}>|</span>
                        <div style={{display:'flex', gap:'8px'}}>
                            {['📢', '🎉', '⚠️', '💖', '🎁'].map(icon => (
                                <button key={icon} onClick={() => setNoticeContent(p => p + icon)} style={{background:'none', border:'none', cursor:'pointer', fontSize: '14px', padding: 0}}>{icon}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 내용 */}
                <div style={{...styles.formRow, borderBottom: 'none'}}>
                    <div style={styles.formLabel}>· 내용 (Content) <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                    <div style={{...styles.formContent, padding: '12px 16px'}}>
                        <textarea 
                            value={noticeContent} 
                            onChange={e=>setNoticeContent(e.target.value)} 
                            placeholder="상세 내용을 작성해주세요..."
                            style={{ width: '100%', minHeight: '150px', padding: '12px', border: '1px solid #CCC', borderRadius: '2px', outline: 'none', resize: 'vertical', fontSize: noticeFontSize, fontFamily: noticeFontFamily }} 
                        />
                    </div>
                </div>
            </div>

            {/* 발송 버튼 */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <button onClick={handleSend} disabled={isSaving} style={{ ...styles.submitBtn, opacity: isSaving ? 0.6 : 1 }}>
                    <Send size={16} /> {isSaving ? "데이터 처리 중..." : (msgType === 'notice' ? "전체 공지사항 게시하기" : "대상에게 알림/쪽지 발송하기")}
                </button>
            </div>

            {/* 3. 공지사항 데이터 테이블 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>
                    <Headset size={14} style={{verticalAlign: 'middle', marginRight:'4px'}}/>
                    전체 공지사항 내역 <span style={{color: '#0ea5e9'}}>({globalNotices.length})</span>
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>※ 개별 발송된 쪽지 내역은 유저 상세정보 탭에서 확인 가능합니다.</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #333' }}>
                <thead>
                    <tr>
                        <th style={{...styles.tableHeader, width: '60px'}}>번호</th>
                        <th style={{...styles.tableHeader, width: '150px'}}>등록일시</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>공지 제목</th>
                        <th style={{...styles.tableHeader, width: '100px'}}>상태</th>
                        <th style={{...styles.tableHeader, width: '80px'}}>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoadingNotices ? (
                        <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '12px' }}>데이터를 불러오는 중입니다...</td></tr>
                    ) : globalNotices.length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '12px' }}>등록된 공지사항이 없습니다.</td></tr>
                    ) : (
                        globalNotices.map((notice, idx) => (
                            <tr key={notice.id} style={{ borderBottom: `1px solid ${styles.tableCell.borderBottom}`, backgroundColor: '#FFF' }}>
                                <td style={styles.tableCell}>{idx + 1}</td>
                                
                                <td style={styles.tableCell}>
                                    {new Date(notice.created_at).toLocaleString()}
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px', fontWeight: 'bold', color: '#111'}}>
                                    {notice.title}
                                </td>
                                
                                <td style={styles.tableCell}>
                                    {notice.is_active ? (
                                        <span style={{ color: '#059669', fontWeight: 'bold' }}>게시중</span>
                                    ) : (
                                        <span style={{ color: '#999' }}>숨김</span>
                                    )}
                                </td>
                                
                                <td style={styles.tableCell}>
                                    <button 
                                        onClick={() => handleDeleteNotice(notice.id)} 
                                        style={{...styles.actionBtnRed, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '0 auto'}}
                                    >
                                        <Trash2 size={12}/> 삭제
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}