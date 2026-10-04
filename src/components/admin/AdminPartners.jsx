// src/components/admin/AdminPartners.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';

// 🚨 모듈화된 신규 컴포넌트 임포트
import UserDetailModal from './UserDetailModal';

export default function AdminPartners({ adminTheme }) {
    const queryClient = useQueryClient();

    // 전체 회원 리스트 상태 관리
    const [page, setPage] = useState(1);
    const pageSize = 20; 
    const [quickRole, setQuickRole] = useState('all'); 
    const [searchType, setSearchType] = useState('email'); 
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [selectedUser, setSelectedUser] = useState(null);

    // 검색어 디바운싱 처리
    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(searchInput); setPage(1); }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // 회원 데이터 페칭
    const { data: usersData, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['adminUsersList', page, pageSize, debouncedSearch, quickRole, sortConfig],
        queryFn: async () => {
            let query = supabase.from('profiles').select('*', { count: 'exact' });

            if (debouncedSearch) query = query.or(`${searchType}.ilike.%${debouncedSearch}%`);

            if (quickRole === 'free') query = query.eq('role', 'user').or('membership_tier.eq.free,membership_tier.is.null');
            else if (quickRole === 'basic') query = query.eq('role', 'user').eq('membership_tier', 'basic');
            else if (quickRole === 'premium') query = query.eq('role', 'user').eq('membership_tier', 'premium');
            else if (quickRole === 'partner') query = query.eq('role', 'partner');
            else if (quickRole === 'blocked') query = query.eq('is_blocked', true);

            query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
            const from = (page - 1) * pageSize;
            const { data, count, error } = await query.range(from, from + pageSize - 1);
            
            if (error) throw error;
            return { users: data || [], totalCount: count || 0 };
        }
    });

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
                .ios-wrap { width: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif; background-color: transparent; }
                .ios-title { font-size: 24px; font-weight: 800; color: #1C1C1E; margin: 0 0 6px 0; letter-spacing: -0.5px; }
                .ios-desc { font-size: 13px; color: #8E8E93; margin: 0 0 24px 0; font-weight: 500; }
                .ios-toolbar { display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border-radius: 12px; padding: 10px 16px; margin-bottom: 16px; border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
                .ios-search-box { display: flex; align-items: center; background: #F2F2F7; border-radius: 8px; padding: 4px 10px; flex: 1; max-width: 320px; }
                .ios-search-input { border: none; background: transparent; outline: none; font-size: 13px; padding: 4px; width: 100%; color: #1C1C1E; font-weight: 500; }
                .ios-select { border: none; background: transparent; outline: none; font-size: 13px; color: #1C1C1E; font-weight: 600; padding: 4px; }
                .ios-table-wrap { background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
                .ios-table { width: 100%; border-collapse: collapse; }
                .ios-th { background-color: #F9F9FB; padding: 12px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #8E8E93; border-bottom: 0.5px solid #E5E5EA; text-transform: uppercase; letter-spacing: -0.2px; cursor: pointer; }
                .ios-td { padding: 12px 10px; border-bottom: 0.5px solid #E5E5EA; font-size: 13px; color: #1C1C1E; font-weight: 500; vertical-align: middle; }
                .ios-tr:last-child .ios-td { border-bottom: none; }
                .ios-tr:hover { background-color: #F9F9FB; }
                .ios-tr.blocked { background-color: #FFF0F0; }
                .ios-badge { display: inline-flex; align-items: center; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; }
                .ios-badge.admin { background: #1C1C1E; color: #FFF; }
                .ios-badge.partner { background: #E5F0FF; color: #007AFF; }
                .ios-badge.premium { background: #FFF5E5; color: #FF9500; }
                .ios-badge.basic { background: #E5FBEB; color: #34C759; }
                .ios-badge.free { background: #F2F2F7; color: #8E8E93; }
                .ios-btn-micro { border: none; background: #F2F2F7; color: #007AFF; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap; }
                .ios-btn-micro:active { transform: scale(0.95); opacity: 0.8; }
                .ios-btn-micro.outline { background: transparent; border: 1px solid #E5E5EA; color: #1C1C1E; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}} />

            <div>
                <h2 className="ios-title">회원 및 권한 관리</h2>
                <p className="ios-desc">플랫폼에 가입한 모든 회원을 검색하고 자산 및 권한을 관리합니다.</p>
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
                            <th className="ios-th" style={{ textAlign: 'right' }} onClick={() => handleSort('point_balance')}>포인트 {getSortIcon('point_balance')}</th>
                            <th className="ios-th" style={{ textAlign: 'right' }} onClick={() => handleSort('game_money_balance')}>게임머니 {getSortIcon('game_money_balance')}</th>
                            <th className="ios-th" style={{ textAlign: 'right' }} onClick={() => handleSort('ticket_count')}>열람쿠폰 {getSortIcon('ticket_count')}</th>
                            <th className="ios-th" onClick={() => handleSort('created_at')}>가입일 {getSortIcon('created_at')}</th>
                            <th className="ios-th" style={{ textAlign: 'right', paddingRight: '16px' }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoadingUsers ? (
                            <tr><td colSpan="8" className="ios-td" style={{ textAlign: 'center', padding: '40px' }}>로딩 중...</td></tr>
                        ) : (!usersList.length) ? (
                            <tr><td colSpan="8" className="ios-td" style={{ textAlign: 'center', padding: '40px' }}>회원이 없습니다.</td></tr>
                        ) : (
                            usersList.map((u, idx) => (
                                <tr key={u.id} className={`ios-tr ${u.is_blocked ? 'blocked' : ''}`}>
                                    <td className="ios-td" style={{ color: '#8E8E93', fontSize: '12px' }}>{pageSize * (page - 1) + idx + 1}</td>
                                    <td className="ios-td">
                                        <div style={{ fontWeight: '600', color: u.is_blocked ? '#FF3B30' : '#1C1C1E' }}>{u.email}</div>
                                        <div style={{ fontSize: '11px', color: '#8E8E93' }}>{u.name || '-'}</div>
                                    </td>
                                    <td className="ios-td">{getTierBadge(u.role, u.membership_tier)}</td>
                                    <td className="ios-td" style={{ textAlign: 'right', fontWeight: '700', color: '#D97706' }}>{(u.point_balance || 0).toLocaleString()} P</td>
                                    <td className="ios-td" style={{ textAlign: 'right', fontWeight: '700', color: '#7C3AED' }}>{(u.game_money_balance || 0).toLocaleString()} G</td>
                                    <td className="ios-td" style={{ textAlign: 'right', fontWeight: '700', color: '#007AFF' }}>{u.ticket_count || 0} 장</td>
                                    <td className="ios-td" style={{ fontSize: '12px', color: '#8E8E93' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td className="ios-td" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                        <button className="ios-btn-micro" onClick={() => setSelectedUser(u)}>상세/자산 관리</button>
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

            {/* 🚨 분리된 모달 컴포넌트 렌더링 */}
            {selectedUser && (
                <UserDetailModal 
                    user={selectedUser} 
                    onClose={() => setSelectedUser(null)} 
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ['adminUsersList'] })}
                    setSelectedUser={setSelectedUser}
                />
            )}
        </div>
    );
}