// src/components/admin/AdminPartners.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Settings, FileText, X } from 'lucide-react';

export default function AdminPartners({ adminTheme }) {
    const queryClient = useQueryClient();

    // ==========================================================
    // 전체 회원 리스트 및 권한 제어 상태 관리
    // ==========================================================
    const [page, setPage] = useState(1);
    const pageSize = 20; 

    const [quickRole, setQuickRole] = useState('all'); 
    const [searchType, setSearchType] = useState('email'); 
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    // 검색어 디바운싱 처리
    useEffect(() => {
        const timer = setTimeout(() => { 
            setDebouncedSearch(searchInput); 
            setPage(1); 
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // 회원 데이터 페칭
    const { data: usersData, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['adminUsersList', page, pageSize, debouncedSearch, quickRole, sortConfig],
        queryFn: async () => {
            let query = supabase.from('profiles').select('*', { count: 'exact' });

            if (debouncedSearch) {
                query = query.or(`${searchType}.ilike.%${debouncedSearch}%`);
            }

            if (quickRole === 'free') {
                query = query.eq('role', 'user').or('membership_tier.eq.free,membership_tier.is.null');
            } else if (quickRole === 'basic') {
                query = query.eq('role', 'user').eq('membership_tier', 'basic');
            } else if (quickRole === 'premium') {
                query = query.eq('role', 'user').eq('membership_tier', 'premium');
            } else if (quickRole === 'partner') {
                query = query.eq('role', 'partner');
            } else if (quickRole === 'blocked') {
                query = query.eq('is_blocked', true);
            }

            query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
            const from = (page - 1) * pageSize;
            const { data, count, error } = await query.range(from, from + pageSize - 1);
            
            if (error) throw error;
            return { users: data || [], totalCount: count || 0 };
        }
    });

    const [selectedUser, setSelectedUser] = useState(null);
    const [modalTab, setModalTab] = useState('info'); 
    const [memoText, setMemoText] = useState('');
    const [isSavingMemo, setIsSavingMemo] = useState(false);

    // ==========================================================
    // 핸들러 함수 모음
    // ==========================================================
    const handleUpdateTarotTicket = async (changeAmount) => {
        if (!selectedUser) return;
        const currentTickets = selectedUser.tarot_ticket_count || 0;
        if (changeAmount < 0 && currentTickets < Math.abs(changeAmount)) return alert("보유한 열람권보다 더 많이 차감할 수 없습니다.");
        const actionText = changeAmount > 0 ? `${changeAmount}장 지급` : `${Math.abs(changeAmount)}장 차감`;
        if (!window.confirm(`타로 열람권을 ${actionText} 하시겠습니까?`)) return;

        try {
            const newTicketCount = currentTickets + changeAmount;
            const { error } = await supabase.from('profiles').update({ tarot_ticket_count: newTicketCount }).eq('id', selectedUser.id);
            if (error) throw error;
            alert(`✅ 완료 (현재: ${newTicketCount}장)`);
            setSelectedUser(prev => ({ ...prev, tarot_ticket_count: newTicketCount }));
            queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
        } catch (error) { alert("열람권 수정 오류"); } 
    };

    const handleUpdateGeneralTicket = async (changeAmount) => {
        if (!selectedUser) return;
        const currentGeneralTickets = selectedUser.general_ticket_count || 0;
        if (changeAmount < 0 && currentGeneralTickets < Math.abs(changeAmount)) return alert("보유한 열람권보다 더 많이 차감할 수 없습니다.");
        const actionText = changeAmount > 0 ? `${changeAmount}장 지급` : `${Math.abs(changeAmount)}장 차감`;
        if (!window.confirm(`종합 열람권을 ${actionText} 하시겠습니까?`)) return;

        try {
            const newTicketCount = currentGeneralTickets + changeAmount;
            const { error } = await supabase.from('profiles').update({ general_ticket_count: newTicketCount }).eq('id', selectedUser.id);
            if (error) throw error;
            alert(`✅ 완료 (현재: ${newTicketCount}장)`);
            setSelectedUser(prev => ({ ...prev, general_ticket_count: newTicketCount }));
            queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
        } catch (error) { alert("열람권 수정 오류"); } 
    };

    const handleToggleBlock = async (e, userId, isBlocked) => {
        e.stopPropagation(); 
        if (!window.confirm(`회원을 ${isBlocked ? "차단 해제" : "차단"}하시겠습니까?`)) return;
        try {
            await supabase.from('profiles').update({ is_blocked: !isBlocked }).eq('id', userId);
            queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
            if (selectedUser && selectedUser.id === userId) setSelectedUser(prev => ({ ...prev, is_blocked: !isBlocked }));
            alert(`✅ 처리 완료`);
        } catch (error) { alert("처리 실패"); }
    };

    const [isUpdatingTier, setIsUpdatingTier] = useState(false);
    
    // 🚨 직접 update() 방식을 완전히 제거하고 백엔드 보안 함수(RPC)를 호출하도록 수정 완료
    const handleChangeUserTier = async (newTier) => {
        if (!selectedUser) return;
        if (!window.confirm('선택하신 등급으로 변경하시겠습니까?')) return;
        setIsUpdatingTier(true);
        
        try {
            let updatedRole = newTier === 'partner' ? 'partner' : 'user';
            let updatedTier = newTier === 'partner' ? (selectedUser.membership_tier || 'free') : newTier;

            // 1. 프로필 테이블 등급 업데이트 (보안 트리거 우회를 위해 RPC 사용)
            const { error: profileError } = await supabase.rpc('admin_update_user_tier', {
                p_target_user_id: selectedUser.id,
                p_new_role: updatedRole,
                p_new_tier: updatedTier
            });
                
            if (profileError) throw profileError;

            // 2. 파트너 상점 DB 연동 처리
            try {
                if (updatedRole === 'partner') {
                    const { data: existingShop } = await supabase.from('partner_shops').select('partner_id').eq('partner_id', selectedUser.id).maybeSingle();
                    if (!existingShop) {
                        await supabase.from('partner_shops').insert([{ partner_id: selectedUser.id, shop_name: '신규 상점', is_active: true }]);
                    } else {
                        await supabase.from('partner_shops').update({ is_active: true }).eq('partner_id', selectedUser.id);
                    }
                } else {
                    await supabase.from('partner_shops').update({ is_active: false }).eq('partner_id', selectedUser.id);
                }
            } catch (shopError) {
                console.warn('파트너 상점 DB 연동 무시됨:', shopError);
            }
            
            setSelectedUser(prev => ({ ...prev, role: updatedRole, membership_tier: updatedTier }));
            queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
            alert('✅ 회원 등급 변경이 완료되었습니다.');
        } catch (error) { 
            console.error('등급 변경 에러:', error);
            // 에러 객체가 깨지지 않고 정확한 원인이 출력되도록 수정
            const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : error);
            alert(`❌ 등급 변경 실패: ${errorMsg}`); 
        } finally { 
            setIsUpdatingTier(false); 
        }
    };

    const handleSaveMemo = async () => {
        if (!selectedUser) return;
        setIsSavingMemo(true);
        try {
            await supabase.from('profiles').update({ admin_memo: memoText }).eq('id', selectedUser.id);
            alert("✅ 저장 완료");
            setSelectedUser(prev => ({...prev, admin_memo: memoText}));
            queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
        } catch (error) { alert("저장 실패"); } finally { setIsSavingMemo(false); }
    };

    const getTierBadge = (role, tier) => {
        if (role === 'admin') return <span className="ios-badge admin">ADMIN</span>;
        if (role === 'partner') return <span className="ios-badge partner">파트너</span>;
        if (tier === 'premium') return <span className="ios-badge premium">VIP</span>;
        if (tier === 'basic') return <span className="ios-badge basic">구독</span>;
        return <span className="ios-badge free">무료</span>;
    };

    const usersList = usersData?.users || [];
    const totalPages = Math.ceil((usersData?.totalCount || 0) / pageSize) || 1;

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span style={{ color: '#C7C7CC', fontSize: '10px', marginLeft: '4px' }}>↕</span>;
        return <span style={{ color: '#007AFF', fontSize: '10px', marginLeft: '4px' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
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

                /* Search & Filter Bar */
                .ios-toolbar {
                    display: flex; justify-content: space-between; align-items: center;
                    background: #FFFFFF; border-radius: 12px; padding: 10px 16px; margin-bottom: 16px;
                    border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .ios-search-box {
                    display: flex; align-items: center; background: #F2F2F7; border-radius: 8px; padding: 4px 10px; flex: 1; max-width: 320px;
                }
                .ios-search-input {
                    border: none; background: transparent; outline: none; font-size: 13px; padding: 4px; width: 100%; color: #1C1C1E; font-weight: 500;
                }
                .ios-select {
                    border: none; background: transparent; outline: none; font-size: 13px; color: #1C1C1E; font-weight: 600; padding: 4px;
                }

                /* iOS Table (List Look) */
                .ios-table-wrap {
                    background-color: #FFFFFF; border-radius: 12px; overflow: hidden;
                    border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .ios-table { width: 100%; border-collapse: collapse; }
                .ios-th {
                    background-color: #F9F9FB; padding: 12px 10px; text-align: left;
                    font-size: 11px; font-weight: 700; color: #8E8E93; border-bottom: 0.5px solid #E5E5EA;
                    text-transform: uppercase; letter-spacing: -0.2px; cursor: pointer;
                }
                .ios-td {
                    padding: 12px 10px; border-bottom: 0.5px solid #E5E5EA;
                    font-size: 13px; color: #1C1C1E; font-weight: 500; vertical-align: middle;
                }
                .ios-tr:last-child .ios-td { border-bottom: none; }
                .ios-tr:hover { background-color: #F9F9FB; }
                .ios-tr.blocked { background-color: #FFF0F0; }

                /* Badges */
                .ios-badge { display: inline-flex; align-items: center; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; }
                .ios-badge.admin { background: #1C1C1E; color: #FFF; }
                .ios-badge.partner { background: #E5F0FF; color: #007AFF; }
                .ios-badge.premium { background: #FFF5E5; color: #FF9500; }
                .ios-badge.basic { background: #E5FBEB; color: #34C759; }
                .ios-badge.free { background: #F2F2F7; color: #8E8E93; }

                /* Micro Buttons */
                .ios-btn-micro {
                    border: none; background: #F2F2F7; color: #007AFF; font-size: 11px; font-weight: 700;
                    padding: 4px 8px; border-radius: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap;
                }
                .ios-btn-micro:active { transform: scale(0.95); opacity: 0.8; }
                .ios-btn-micro.danger { color: #FF3B30; background: #FFE5E5; }
                .ios-btn-micro.success { color: #34C759; background: #E5FBEB; }
                .ios-btn-micro.outline { background: transparent; border: 1px solid #E5E5EA; color: #1C1C1E; }

                /* Modal */
                .ios-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                    display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 20px; animation: fadeIn 0.2s ease-out;
                }
                .ios-modal-card {
                    background: #F2F2F7; width: 100%; max-width: 500px; border-radius: 20px; overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.15); animation: slideUp 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2);
                    display: flex; flex-direction: column; max-height: 90vh;
                }
                .ios-modal-header {
                    padding: 16px 20px; background: #FFFFFF; display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 0.5px solid #E5E5EA;
                }
                .ios-modal-title { font-size: 16px; font-weight: 700; color: #1C1C1E; margin: 0; }
                .ios-modal-close { background: #F2F2F7; border: none; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #8E8E93; cursor: pointer; }
                .ios-modal-body { padding: 20px; overflow-y: auto; flex: 1; }
                
                /* Inset Group inside Modal */
                .ios-inset-group { background: #FFFFFF; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
                .ios-inset-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 0.5px solid #E5E5EA; min-height: 44px; }
                .ios-inset-row:last-child { border-bottom: none; }
                .ios-inset-label { font-size: 13px; font-weight: 600; color: #1C1C1E; }
                .ios-inset-value { font-size: 13px; font-weight: 500; color: #8E8E93; text-align: right; }

                /* Segment Controls inside Modal */
                .ios-segment { display: inline-flex; background-color: #E5E5EA; border-radius: 8px; padding: 2px; }
                .ios-segment-btn {
                    padding: 6px 14px; font-size: 12px; font-weight: 600; color: #8E8E93;
                    border-radius: 6px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 4px; flex: 1; justify-content: center;
                }
                .ios-segment-btn.active { background-color: #FFFFFF; color: #1C1C1E; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }

                .ios-textarea {
                    width: 100%; border: none; outline: none; background: transparent; font-size: 13px;
                    color: #1C1C1E; line-height: 1.5; resize: vertical; min-height: 120px; font-family: inherit;
                }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}} />

            <div>
                <h2 className="ios-title">회원 및 권한 관리</h2>
                <p className="ios-desc">플랫폼에 가입한 모든 회원을 검색하고 등급 및 권한을 관리합니다.</p>
            </div>

            <div className="ios-toolbar">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select className="ios-select" style={{ background: '#F2F2F7', borderRadius: '8px', padding: '6px 10px' }} value={quickRole} onChange={(e) => { setQuickRole(e.target.value); setPage(1); }}>
                        <option value="all">전체 등급</option>
                        <option value="user">일반 무료</option>
                        <option value="basic">베이직 구독</option>
                        <option value="premium">VIP 구독</option>
                        <option value="partner">파트너</option>
                        <option value="blocked">차단된 회원</option>
                    </select>

                    <div className="ios-search-box">
                        <select className="ios-select" value={searchType} onChange={e=>setSearchType(e.target.value)} style={{ borderRight: '0.5px solid #C6C6C8', paddingRight: '6px', marginRight: '6px' }}>
                            <option value="email">이메일</option>
                            <option value="name">이름</option>
                        </select>
                        <input type="text" className="ios-search-input" placeholder="검색어 입력..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                        <Search size={14} color="#8E8E93" />
                    </div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#8E8E93' }}>총 <span style={{ color: '#1C1C1E' }}>{usersData?.totalCount || 0}</span>명</div>
            </div>

            <div className="ios-table-wrap">
                <table className="ios-table">
                    <thead>
                        <tr>
                            <th className="ios-th" onClick={() => handleSort('id')}>NO</th>
                            <th className="ios-th" onClick={() => handleSort('email')}>계정 (이메일/이름) {getSortIcon('email')}</th>
                            <th className="ios-th" onClick={() => handleSort('role')}>등급 {getSortIcon('role')}</th>
                            <th className="ios-th" style={{ textAlign: 'right' }} onClick={() => handleSort('tarot_ticket_count')}>타로 {getSortIcon('tarot_ticket_count')}</th>
                            <th className="ios-th" style={{ textAlign: 'right' }} onClick={() => handleSort('general_ticket_count')}>종합 {getSortIcon('general_ticket_count')}</th>
                            <th className="ios-th" onClick={() => handleSort('created_at')}>가입일 {getSortIcon('created_at')}</th>
                            <th className="ios-th" style={{ textAlign: 'right', paddingRight: '16px' }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoadingUsers ? (
                            <tr><td colSpan="7" className="ios-td" style={{ textAlign: 'center', padding: '40px' }}>로딩 중...</td></tr>
                        ) : (!usersList.length) ? (
                            <tr><td colSpan="7" className="ios-td" style={{ textAlign: 'center', padding: '40px' }}>회원이 없습니다.</td></tr>
                        ) : (
                            usersList.map((u, idx) => (
                                <tr key={u.id} className={`ios-tr ${u.is_blocked ? 'blocked' : ''}`}>
                                    <td className="ios-td" style={{ color: '#8E8E93', fontSize: '12px' }}>{pageSize * (page - 1) + idx + 1}</td>
                                    <td className="ios-td">
                                        <div style={{ fontWeight: '600', color: u.is_blocked ? '#FF3B30' : '#1C1C1E' }}>{u.email}</div>
                                        <div style={{ fontSize: '11px', color: '#8E8E93' }}>{u.name || '-'}</div>
                                    </td>
                                    <td className="ios-td">{getTierBadge(u.role, u.membership_tier)}</td>
                                    <td className="ios-td" style={{ textAlign: 'right', fontWeight: '700', color: '#FF9500' }}>{u.tarot_ticket_count || 0}</td>
                                    <td className="ios-td" style={{ textAlign: 'right', fontWeight: '700', color: '#007AFF' }}>{u.general_ticket_count || 0}</td>
                                    <td className="ios-td" style={{ fontSize: '12px', color: '#8E8E93' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td className="ios-td" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                            <button className="ios-btn-micro" onClick={() => { setSelectedUser(u); setModalTab('info'); }}>상세 설정</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                <button className="ios-btn-micro outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>◀ 이전</button>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1C1C1E' }}>{page} / {totalPages}</span>
                <button className="ios-btn-micro outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>다음 ▶</button>
            </div>

            {/* 회원 상세 모달 (iOS Card) */}
            {selectedUser && (
                <div className="ios-modal-overlay" onClick={() => setSelectedUser(null)}>
                    <div className="ios-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="ios-modal-header">
                            <h3 className="ios-modal-title">회원 상세 관리 <span style={{fontSize:'13px', color:'#8E8E93', fontWeight:'500'}}>({selectedUser.name})</span></h3>
                            <button className="ios-modal-close" onClick={() => setSelectedUser(null)}><X size={16}/></button>
                        </div>
                        
                        <div style={{ display: 'flex', padding: '12px 20px 0 20px', background: '#FFFFFF' }}>
                            <div className="ios-segment" style={{ width: '100%', marginBottom: '12px' }}>
                                <div className={`ios-segment-btn ${modalTab === 'info' ? 'active' : ''}`} onClick={() => setModalTab('info')}><Settings size={14}/> 권한 및 열람권</div>
                                <div className={`ios-segment-btn ${modalTab === 'memo' ? 'active' : ''}`} onClick={() => { setModalTab('memo'); setMemoText(selectedUser.admin_memo || ''); }}><FileText size={14}/> 관리자 메모</div>
                            </div>
                        </div>

                        <div className="ios-modal-body">
                            {modalTab === 'info' && (
                                <>
                                    <div className="ios-inset-group">
                                        <div className="ios-inset-row">
                                            <span className="ios-inset-label">이메일 계정</span>
                                            <span className="ios-inset-value">{selectedUser.email}</span>
                                        </div>
                                        <div className="ios-inset-row">
                                            <span className="ios-inset-label">등급 변경</span>
                                            <select className="ios-select-clean" style={{ color: '#1C1C1E', fontWeight: '600' }} disabled={isUpdatingTier} value={selectedUser.role === 'partner' ? 'partner' : (selectedUser.membership_tier || 'free')} onChange={(e) => handleChangeUserTier(e.target.value)}>
                                                <option value="free">무료회원</option>
                                                <option value="basic">베이직</option>
                                                <option value="premium">VIP 프리미엄</option>
                                                <option value="partner">파트너</option>
                                            </select>
                                        </div>
                                        <div className="ios-inset-row">
                                            <span className="ios-inset-label">계정 차단</span>
                                            <button className={`ios-btn-micro ${selectedUser.is_blocked ? 'success' : 'danger'}`} onClick={(e) => handleToggleBlock(e, selectedUser.id, selectedUser.is_blocked)}>
                                                {selectedUser.is_blocked ? '차단 해제하기' : '이 계정 차단'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="ios-inset-group">
                                        <div className="ios-inset-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                <span className="ios-inset-label">타로 열람권 잔여</span>
                                                <span style={{ fontSize: '15px', fontWeight: '800', color: '#FF9500' }}>{selectedUser.tarot_ticket_count || 0} 장</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                                <button className="ios-btn-micro outline" style={{flex:1, justifyContent:'center'}} onClick={() => handleUpdateTarotTicket(1)}>+1 지급</button>
                                                <button className="ios-btn-micro outline" style={{flex:1, justifyContent:'center'}} onClick={() => handleUpdateTarotTicket(5)}>+5 지급</button>
                                                <button className="ios-btn-micro danger" style={{flex:1, justifyContent:'center'}} onClick={() => handleUpdateTarotTicket(-1)} disabled={(selectedUser.tarot_ticket_count||0)<=0}>-1 차감</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ios-inset-group">
                                        <div className="ios-inset-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', borderBottom: 'none' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                <span className="ios-inset-label">종합 열람권 <span style={{fontSize:'11px', color:'#8E8E93', fontWeight:'normal'}}>(사주/궁합 등)</span></span>
                                                <span style={{ fontSize: '15px', fontWeight: '800', color: '#007AFF' }}>{selectedUser.general_ticket_count || 0} 장</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                                <button className="ios-btn-micro outline" style={{flex:1, justifyContent:'center'}} onClick={() => handleUpdateGeneralTicket(1)}>+1 지급</button>
                                                <button className="ios-btn-micro outline" style={{flex:1, justifyContent:'center'}} onClick={() => handleUpdateGeneralTicket(5)}>+5 지급</button>
                                                <button className="ios-btn-micro danger" style={{flex:1, justifyContent:'center'}} onClick={() => handleUpdateGeneralTicket(-1)} disabled={(selectedUser.general_ticket_count||0)<=0}>-1 차감</button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {modalTab === 'memo' && (
                                <div className="ios-inset-group" style={{ padding: '16px' }}>
                                    <p style={{ fontSize: '12px', color: '#FF3B30', margin: '0 0 12px 0', fontWeight: '600' }}>※ 고객에게는 절대 노출되지 않는 내부 관리용 메모입니다.</p>
                                    <textarea className="ios-textarea" value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="블랙리스트 사유, CS 내역 등을 입력하세요." />
                                    <button className="ios-btn-micro outline" style={{ width: '100%', marginTop: '16px', padding: '12px', fontSize: '14px', background: '#007AFF', color: '#FFF', border: 'none', justifyContent:'center' }} onClick={handleSaveMemo} disabled={isSavingMemo}>
                                        {isSavingMemo ? '저장 중...' : '메모 저장'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}