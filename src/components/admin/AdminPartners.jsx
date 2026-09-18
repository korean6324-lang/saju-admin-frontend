// src/components/admin/AdminPartners.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Settings, FileText, Activity } from 'lucide-react';
import { useAdminUsers } from './hooks/useAdminUsers';

export default function AdminPartners() {
    // ==========================================================
    // 상태 관리 (검색, 페이징, 모달 등)
    // ==========================================================
    const [page, setPage] = useState(1);
    const pageSize = 20; 
    const queryClient = useQueryClient();

    // 다중 선택 필터 (엔터프라이즈 스타일)
    const [filterRoles, setFilterRoles] = useState({
        user: true, partner: true, vip: true, blocked: false
    });
    
    const [searchType, setSearchType] = useState('email'); // 'email' | 'name'
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // 디바운스 적용
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // 훅 호출
    const { data, isLoading, isError } = useAdminUsers(page, pageSize, debouncedSearch, filterRoles);

    // 모달 및 탭 상태
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalTab, setModalTab] = useState('info'); // 'info' | 'memo' | 'log'
    const [memoText, setMemoText] = useState('');
    const [isSavingMemo, setIsSavingMemo] = useState(false);

    // ==========================================================
    // 기존 기능 로직 유지 (낙관적 업데이트)
    // ==========================================================
    const handleUpgradePartner = async (e, userId, currentRole) => {
        e.stopPropagation();
        if (!window.confirm(currentRole === 'partner' ? "파트너 권한을 회수하시겠습니까?" : "스토어 파트너로 승인하시겠습니까?")) return;
        const newRole = currentRole === 'partner' ? 'user' : 'partner';
        const newStatus = currentRole === 'partner' ? 'rejected' : 'approved';

        queryClient.setQueryData(['adminUsers', page, pageSize, debouncedSearch, filterRoles], (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                users: oldData.users.map(u => u.id === userId ? { ...u, role: newRole, partners: u.partners?.length > 0 ? [{ ...u.partners[0], status: newStatus }] : [{ id: userId, store_name: '신규 상점', status: newStatus }] } : u)
            };
        });

        try {
            await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
            const { data: partnerData } = await supabase.from('partners').select('id').eq('id', userId).maybeSingle();
            if (partnerData) {
                await supabase.from('partners').update({ status: newStatus }).eq('id', userId);
            } else if (newRole === 'partner') {
                await supabase.from('partners').insert([{ id: userId, store_name: '신규 상점', status: 'approved' }]);
            }
            alert(`✅ 처리되었습니다.`);
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); 
        } catch (error) { 
            alert(`❌ DB 저장 실패`);
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); 
        }
    };

    const handleToggleBlock = async (e, userId, isBlocked) => {
        e.stopPropagation(); 
        if (!window.confirm(`회원을 ${isBlocked ? "차단 해제" : "차단"}하시겠습니까?`)) return;

        queryClient.setQueryData(['adminUsers', page, pageSize, debouncedSearch, filterRoles], (old) => {
            if (!old) return old;
            return { ...old, users: old.users.map(u => u.id === userId ? { ...u, is_blocked: !isBlocked } : u) };
        });

        try {
            await supabase.from('profiles').update({ is_blocked: !isBlocked }).eq('id', userId);
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        } catch (error) { queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); }
    };

    const handleSaveMemo = async () => {
        if (!selectedUser) return;
        setIsSavingMemo(true);
        try {
            await supabase.from('profiles').update({ admin_memo: memoText }).eq('id', selectedUser.id);
            alert("✅ 메모가 저장되었습니다.");
            setSelectedUser(prev => ({...prev, admin_memo: memoText}));
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        } catch (error) { alert("메모 저장 실패"); }
        finally { setIsSavingMemo(false); }
    };

    const usersList = data?.users || [];
    const totalPages = Math.ceil((data?.totalCount || 0) / pageSize) || 1;

    // ==========================================================
    // 🎨 엔터프라이즈 화이트 테마 스타일 객체
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '20px' },
        
        searchBox: { border: '2px solid #E5E7EB', borderRadius: '2px', display: 'flex', flexDirection: 'column' },
        searchRow: { display: 'flex', borderBottom: '1px solid #E5E7EB' },
        searchLabel: { width: '120px', backgroundColor: '#F9FAFB', padding: '12px 16px', fontWeight: 'bold', color: '#444', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center' },
        searchContent: { flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '16px' },
        checkboxLabel: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' },
        
        // 🚨 수정된 부분: 버튼을 비율에 맞게 고정하고 디자인을 단정하게 수정
        searchBtn: { 
            backgroundColor: '#0ea5e9', 
            color: '#FFF', 
            border: 'none', 
            width: '90px', // 가로 폭 고정
            borderRadius: '2px',
            fontWeight: 'bold', 
            fontSize: '13px', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '6px'
        },
        
        // 테이블
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333' },
        tableCell: { padding: '8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
        
        // 액션 버튼
        actionBtn: { padding: '4px 8px', border: '1px solid #CCC', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#333' },
        actionBtnBlue: { padding: '4px 8px', border: '1px solid #0ea5e9', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#0ea5e9' },
        actionBtnRed: { padding: '4px 8px', border: '1px solid #ef4444', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#ef4444' },
    };

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 영역 */}
            <div>
                <h2 style={styles.headerTitle}>회원 리스트 및 권한 관리</h2>
                <p style={styles.headerSub}>[회원 관리 &gt; 회원 리스트] 검색조건을 선택하고 [검색] 버튼을 클릭하면 회원 리스트가 나타납니다.</p>
            </div>

            {/* 1. 검색 및 필터 패널 (수정된 레이아웃) */}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '4px', marginBottom: '30px' }}>
                <div style={{ ...styles.searchBox, flex: 1 }}>
                    
                    {/* 첫 번째 줄: 회원 등급 */}
                    <div style={styles.searchRow}>
                        <div style={styles.searchLabel}>· 회원등급</div>
                        <div style={styles.searchContent}>
                            <label style={styles.checkboxLabel}>
                                <input type="checkbox" checked={filterRoles.user && filterRoles.partner && filterRoles.vip} onChange={(e) => setFilterRoles({user: e.target.checked, partner: e.target.checked, vip: e.target.checked, blocked: filterRoles.blocked})} /> 
                                전체
                            </label>
                            <span style={{color:'#CCC'}}>|</span>
                            <label style={styles.checkboxLabel}>
                                <input type="checkbox" checked={filterRoles.user} onChange={(e) => setFilterRoles({...filterRoles, user: e.target.checked})} /> 일반회원
                            </label>
                            <label style={styles.checkboxLabel}>
                                <input type="checkbox" checked={filterRoles.vip} onChange={(e) => setFilterRoles({...filterRoles, vip: e.target.checked})} /> VIP회원
                            </label>
                            <label style={styles.checkboxLabel}>
                                <input type="checkbox" checked={filterRoles.partner} onChange={(e) => setFilterRoles({...filterRoles, partner: e.target.checked})} /> 스토어 파트너
                            </label>
                            <label style={styles.checkboxLabel}>
                                <input type="checkbox" checked={filterRoles.blocked} onChange={(e) => setFilterRoles({...filterRoles, blocked: e.target.checked})} /> <span style={{color: '#ef4444'}}>차단/탈퇴대기</span>
                            </label>
                        </div>
                    </div>

                    {/* 두 번째 줄: 검색어 */}
                    <div style={{ ...styles.searchRow, borderBottom: 'none' }}>
                        <div style={styles.searchLabel}>· 검색어</div>
                        <div style={styles.searchContent}>
                            <select value={searchType} onChange={(e)=>setSearchType(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #CCC', fontSize: '12px', outline: 'none' }}>
                                <option value="email">이메일/아이디</option>
                                <option value="name">이름</option>
                            </select>
                            <input 
                                type="text" 
                                value={searchInput} 
                                onChange={(e) => setSearchInput(e.target.value)} 
                                style={{ width: '300px', padding: '4px 8px', border: '1px solid #CCC', fontSize: '12px', outline: 'none' }} 
                            />
                            <label style={styles.checkboxLabel}>
                                <input type="checkbox" /> 현재 접속중인 회원만 검색
                            </label>
                        </div>
                    </div>
                </div>

                {/* 🚨 우측 단정해진 검색 버튼 */}
                <button style={styles.searchBtn}>
                    <Search size={22} />
                    <span>검색</span>
                </button>
            </div>

            {/* 2. 데이터 테이블 패널 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#555' }}>
                    검색결과 : <span style={{fontWeight: 'bold', color: '#ef4444'}}>{data?.totalCount?.toLocaleString() || 0}</span> 명
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button style={styles.actionBtn}>선택회원 삭제</button>
                    <button style={styles.actionBtn}>엑셀저장 (Excel)</button>
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #333' }}>
                <thead>
                    <tr>
                        <th style={{...styles.tableHeader, width: '40px'}}><input type="checkbox" /></th>
                        <th style={{...styles.tableHeader, width: '60px'}}>번호</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>아이디 (이메일)</th>
                        <th style={{...styles.tableHeader, width: '120px'}}>이름</th>
                        <th style={{...styles.tableHeader, width: '100px'}}>등급</th>
                        <th style={{...styles.tableHeader, width: '80px'}}>상태</th>
                        <th style={{...styles.tableHeader, width: '120px', textAlign: 'right', paddingRight: '16px'}}>보유 캐시</th>
                        <th style={{...styles.tableHeader, width: '120px'}}>가입일</th>
                        <th style={{...styles.tableHeader, width: '180px'}}>권한 관리</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>데이터 로딩 중...</td></tr>
                    ) : usersList.length === 0 ? (
                        <tr><td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>조건에 일치하는 회원이 없습니다.</td></tr>
                    ) : (
                        usersList.map((u, idx) => (
                            <tr key={u.id} style={{ backgroundColor: u.is_blocked ? '#fef2f2' : '#FFF' }}>
                                <td style={styles.tableCell}><input type="checkbox" /></td>
                                <td style={styles.tableCell}>{pageSize * (page - 1) + idx + 1}</td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                    <div 
                                        onClick={() => { setSelectedUser(u); setMemoText(u.admin_memo || ''); setModalTab('info'); }}
                                        style={{ color: '#0ea5e9', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        {u.email}
                                    </div>
                                </td>
                                
                                <td style={styles.tableCell}>{u.name || '-'}</td>
                                
                                <td style={styles.tableCell}>
                                    {u.role === 'admin' && '최고관리자'}
                                    {u.role === 'partner' && <span style={{color: '#0ea5e9', fontWeight: 'bold'}}>스토어 파트너</span>}
                                    {u.role === 'user' && (u.is_vip ? <span style={{color: '#d97706', fontWeight: 'bold'}}>VIP회원</span> : '일반회원')}
                                </td>
                                
                                <td style={{...styles.tableCell, color: u.is_blocked ? '#ef4444' : '#333'}}>
                                    {u.is_blocked ? '차단' : '정상'}
                                </td>

                                <td style={{...styles.tableCell, textAlign: 'right', paddingRight: '16px', fontWeight: 'bold'}}>
                                    {u.cash_balance?.toLocaleString() || 0}
                                </td>

                                <td style={styles.tableCell}>{new Date(u.created_at).toLocaleDateString()}</td>

                                <td style={{...styles.tableCell, display: 'flex', gap: '4px', justifyContent: 'center'}}>
                                    <button 
                                        onClick={() => { setSelectedUser(u); setMemoText(u.admin_memo || ''); setModalTab('memo'); }}
                                        style={styles.actionBtn}
                                    >
                                        [상세/메모]
                                    </button>
                                    <button 
                                        onClick={(e) => handleUpgradePartner(e, u.id, u.role)}
                                        style={u.role === 'partner' ? styles.actionBtnRed : styles.actionBtnBlue}
                                    >
                                        {u.role === 'partner' ? '강등' : '승급'}
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* 페이징 UI */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...styles.actionBtn, padding: '6px 12px' }}>◀ 이전</button>
                <span style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 8px' }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...styles.actionBtn, padding: '6px 12px' }}>다음 ▶</button>
            </div>

            {/* 3. 상세 정보 모달창 */}
            {selectedUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ width: '600px', backgroundColor: '#FFF', border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                        
                        <div style={{ backgroundColor: '#1F2937', color: '#FFF', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{selectedUser.name || '이름없음'}({selectedUser.email}) 님의 상세 정보</span>
                            <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <button onClick={() => setModalTab('info')} style={{ flex: 1, padding: '12px', border: 'none', background: modalTab === 'info' ? '#FFF' : 'transparent', borderBottom: modalTab === 'info' ? '2px solid #0ea5e9' : 'none', fontWeight: modalTab === 'info' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px' }}>
                                <Settings size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 회원기본정보
                            </button>
                            <button onClick={() => setModalTab('memo')} style={{ flex: 1, padding: '12px', border: 'none', background: modalTab === 'memo' ? '#FFF' : 'transparent', borderBottom: modalTab === 'memo' ? '2px solid #0ea5e9' : 'none', fontWeight: modalTab === 'memo' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px' }}>
                                <FileText size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 관리자 메모
                            </button>
                            <button onClick={() => setModalTab('log')} style={{ flex: 1, padding: '12px', border: 'none', background: modalTab === 'log' ? '#FFF' : 'transparent', borderBottom: modalTab === 'log' ? '2px solid #0ea5e9' : 'none', fontWeight: modalTab === 'log' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px' }}>
                                <Activity size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 접속/활동 로그
                            </button>
                        </div>

                        <div style={{ padding: '24px', minHeight: '250px' }}>
                            {modalTab === 'info' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ backgroundColor: '#F9FAFB', padding: '10px', width: '120px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>이메일(ID)</td>
                                            <td style={{ padding: '10px', border: '1px solid #E5E7EB' }}>{selectedUser.email}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ backgroundColor: '#F9FAFB', padding: '10px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>가입일시</td>
                                            <td style={{ padding: '10px', border: '1px solid #E5E7EB' }}>{new Date(selectedUser.created_at).toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ backgroundColor: '#F9FAFB', padding: '10px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>계정 상태 제어</td>
                                            <td style={{ padding: '10px', border: '1px solid #E5E7EB' }}>
                                                <button onClick={(e) => handleToggleBlock(e, selectedUser.id, selectedUser.is_blocked)} style={selectedUser.is_blocked ? styles.actionBtnRed : styles.actionBtnBlue}>
                                                    {selectedUser.is_blocked ? '현재 차단됨 (클릭하여 해제)' : '정상 작동중 (클릭하여 차단)'}
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}

                            {modalTab === 'memo' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>※ 고객에게 노출되지 않는 관리자 전용 메모 공간입니다.</div>
                                    <textarea 
                                        value={memoText} 
                                        onChange={(e) => setMemoText(e.target.value)} 
                                        placeholder="이슈 사항, 블랙리스트 사유 등을 상세히 기록하세요."
                                        style={{ width: '100%', height: '150px', padding: '12px', border: '1px solid #CCC', borderRadius: '2px', outline: 'none', resize: 'vertical', fontSize: '12px' }}
                                    />
                                    <div style={{ textAlign: 'center' }}>
                                        <button onClick={handleSaveMemo} disabled={isSavingMemo} style={{ ...styles.actionBtnBlue, padding: '8px 40px' }}>
                                            {isSavingMemo ? '저장 중...' : '메모 저장하기'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {modalTab === 'log' && (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '12px' }}>
                                    방문 로그 및 상세 결제 내역 시스템은 연동 준비 중입니다.<br/>(차기 마일스톤 업데이트 예정)
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}