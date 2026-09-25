// src/components/admin/AdminPartners.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Settings, FileText, Activity, Store, CheckCircle, XCircle, Clock, Users, Crown, ExternalLink, Filter, Wallet, Save } from 'lucide-react';
import { useAdminUsers } from './hooks/useAdminUsers';

export default function AdminPartners({ adminTheme, defaultTab = 'users' }) {
    const queryClient = useQueryClient();

    // ==========================================================
    // 1. 스토어 파트너 입점 심사 로직
    // ==========================================================
    const [applications, setApplications] = useState([]);
    const [isLoadingApps, setIsLoadingApps] = useState(false);
    const [appFilter, setAppFilter] = useState('pending');

    const fetchApplications = async () => {
        setIsLoadingApps(true);
        try {
            const { data, error } = await supabase
                .from('partner_applications')
                .select('*, profiles:user_id(email, name)')
                .eq('status', appFilter)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setApplications(data || []);
        } catch (error) { console.error(error); } 
        finally { setIsLoadingApps(false); }
    };

    useEffect(() => {
        if (defaultTab === 'applications') fetchApplications();
    }, [defaultTab, appFilter]);

    const handleApproveApp = async (app) => {
        if (!window.confirm(`[${app.brand_name}] 브랜드를 화복당 파트너로 승인하시겠습니까?`)) return;
        try {
            await supabase.from('partner_applications').update({ status: 'approved' }).eq('id', app.id);
            await supabase.from('profiles').update({ role: 'partner' }).eq('id', app.user_id);
            await supabase.from('partner_shops').upsert({
                partner_id: app.user_id,
                shop_name: app.brand_name || '신규 상점',
                is_active: true
            }, { onConflict: 'partner_id' });

            alert('✅ 파트너 승인 및 상점 세팅이 완료되었습니다.');
            fetchApplications();
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); 
            queryClient.invalidateQueries({ queryKey: ['approvedPartners'] }); 
        } catch (error) { alert('승인 처리 중 오류가 발생했습니다.'); }
    };

    const handleRejectApp = async (id) => {
        if (!window.confirm('이 입점 신청을 반려(거절) 처리하시겠습니까?')) return;
        try {
            await supabase.from('partner_applications').update({ status: 'rejected' }).eq('id', id);
            alert('반려 처리되었습니다.');
            fetchApplications();
        } catch (error) { alert('처리 중 오류가 발생했습니다.'); }
    };

    const getCategoryBadge = (cat) => {
        if (cat === 'media') return { label: '미디어(음원/VOD)', bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' };
        if (cat === 'character') return { label: '캐릭터/굿즈', bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' };
        if (cat === 'jewelry') return { label: '운기석/주얼리', bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6' };
        return { label: '기타', bg: '#F3F4F6', color: '#6B7280' };
    };

    // ==========================================================
    // 2. 승인된 파트너 전용 조회 로직
    // ==========================================================
    const { data: approvedPartners = [], isLoading: isLoadingPartners } = useQuery({
        queryKey: ['approvedPartners'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, name, cash_balance, created_at, partner_shops(shop_name, custom_domain, is_active)')
                .eq('role', 'partner')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || []; // 🚨 에러 시 빈 배열 반환 보장
        },
        enabled: defaultTab === 'partners'
    });

    // ==========================================================
    // 3. 전체 회원 리스트 및 권한 제어
    // ==========================================================
    const [page, setPage] = useState(1);
    const pageSize = 20; 

    const [quickRole, setQuickRole] = useState('all'); 
    const [searchType, setSearchType] = useState('email'); 
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(searchInput); setPage(1); }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const currentFilterRoles = {
        user: quickRole === 'all' || quickRole === 'user',
        vip: quickRole === 'all' || quickRole === 'vip',
        partner: quickRole === 'all' || quickRole === 'partner',
        blocked: quickRole === 'blocked' 
    };
    if (quickRole === 'blocked') {
        currentFilterRoles.user = false; currentFilterRoles.vip = false; currentFilterRoles.partner = false;
    }

    const { data, isLoading, isError } = useAdminUsers(page, pageSize, debouncedSearch, currentFilterRoles);

    // 🚀 모달용 상태 관리
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalTab, setModalTab] = useState('info'); 
    const [memoText, setMemoText] = useState('');
    const [isSavingMemo, setIsSavingMemo] = useState(false);

    // 🚀 개인 캐시/결제 관리용 상태
    const [cashAmount, setCashAmount] = useState('');
    const [cashType, setCashType] = useState('grant'); 
    const [cashMemo, setCashMemo] = useState('');
    const [isSavingCash, setIsSavingCash] = useState(false);
    const [userTxList, setUserTxList] = useState([]);
    const [isLoadingTx, setIsLoadingTx] = useState(false);

    // 🚨 특정 유저의 결제/포인트 내역 불러오기 (coin_history 동기화 완료)
    const fetchUserTransactions = async (userId) => {
        setIsLoadingTx(true);
        try {
            const { data, error } = await supabase
                .from('coin_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(30); 
            if (error) throw error;
            setUserTxList(data || []);
        } catch (err) {
            console.error("장부 조회 에러:", err);
        } finally {
            setIsLoadingTx(false);
        }
    };

    // 모달 탭이 'cash'일 때만 트랜잭션 불러오기
    useEffect(() => {
        if (selectedUser && modalTab === 'cash') {
            fetchUserTransactions(selectedUser.id);
        }
    }, [selectedUser, modalTab]);

    const handleCashSubmit = async () => {
        if (!selectedUser) return;
        const amountNum = Number(cashAmount);
        if (!cashAmount || isNaN(amountNum) || amountNum <= 0) return alert("금액은 0보다 커야 합니다.");
        
        setIsSavingCash(true);
        try {
            const finalAmount = cashType === 'grant' ? amountNum : -amountNum;
            const txTypeStr = cashType === 'grant' ? 'admin_grant' : 'admin_deduct';
            const defaultMemo = cashType === 'grant' ? '관리자 특별 지급' : '관리자 수동 차감';

            const { error: rpcError } = await supabase.rpc('process_admin_cash_transaction', {
                p_target_user_id: selectedUser.id,
                p_amount: finalAmount,
                p_transaction_type: txTypeStr,
                p_description: cashMemo.trim() || defaultMemo
            });

            if (rpcError) throw rpcError;

            const { data: updatedProfile } = await supabase.from('profiles').select('cash_balance').eq('id', selectedUser.id).single();

            alert(`✅ 캐시 처리가 완료되었습니다.\n[처리 후 잔액: ${updatedProfile?.cash_balance?.toLocaleString() || 0}C]`);
            
            if(updatedProfile) setSelectedUser(prev => ({ ...prev, cash_balance: updatedProfile.cash_balance }));
            
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            fetchUserTransactions(selectedUser.id);
            
            setCashAmount(''); setCashMemo('');
        } catch (error) {
            const errMsg = error.message || error.details || JSON.stringify(error);
            alert(`❌ 처리 실패: 잔액이 부족하거나 오류가 발생했습니다. (${errMsg})`);
        } finally {
            setIsSavingCash(false);
        }
    };

    const handleUpgradePartner = async (e, userId, currentRole) => {
        e.stopPropagation();
        if (!window.confirm(currentRole === 'partner' ? "파트너 권한을 회수하시겠습니까?" : "스토어 파트너로 승인하시겠습니까?")) return;
        const newRole = currentRole === 'partner' ? 'user' : 'partner';

        try {
            await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
            
            if (newRole === 'partner') {
                const { data: existingShop } = await supabase.from('partner_shops').select('partner_id').eq('partner_id', userId).maybeSingle();
                if (!existingShop) {
                    await supabase.from('partner_shops').insert([{ partner_id: userId, shop_name: '신규 상점', is_active: true }]);
                } else {
                    await supabase.from('partner_shops').update({ is_active: true }).eq('partner_id', userId);
                }
            } else {
                await supabase.from('partner_shops').update({ is_active: false }).eq('partner_id', userId);
            }
            
            alert(`✅ 파트너 권한 처리가 완료되었습니다.`);
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); 
            queryClient.invalidateQueries({ queryKey: ['approvedPartners'] }); 
        } catch (error) { alert(`❌ 권한 처리 실패`); }
    };

    const handleToggleBlock = async (e, userId, isBlocked) => {
        e.stopPropagation(); 
        if (!window.confirm(`회원을 ${isBlocked ? "차단 해제" : "차단"}하시겠습니까?`)) return;
        try {
            await supabase.from('profiles').update({ is_blocked: !isBlocked }).eq('id', userId);
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        } catch (error) { alert("처리 실패"); }
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

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedUsersList = [...usersList].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span style={{ color: '#ccc', fontSize: '10px', marginLeft: '4px' }}>↕</span>;
        return <span style={{ color: '#0ea5e9', fontSize: '10px', marginLeft: '4px' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333', minHeight: '800px' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '24px' },
        tableHeader: { backgroundColor: '#F9FAFB', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', cursor: 'pointer', userSelect: 'none', transition: 'background-color 0.2s' }, 
        tableCell: { padding: '10px 8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
        actionBtn: { padding: '4px 8px', border: '1px solid #CCC', backgroundColor: '#FFF', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: '#333' },
        actionBtnBlue: { padding: '4px 8px', border: '1px solid #0ea5e9', backgroundColor: '#FFF', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: '#0ea5e9' },
        actionBtnRed: { padding: '4px 8px', border: '1px solid #ef4444', backgroundColor: '#FFF', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: '#ef4444' },
    };

    return (
        <div style={styles.container}>
            {/* 1. 입점 심사 대기열 화면 */}
            {defaultTab === 'applications' && (
                <div className="fade-in">
                    <div><h2 style={styles.headerTitle}>스토어 파트너 입점 심사</h2><p style={styles.headerSub}>고객이 신청한 스토어 입점 내역을 심사하고 파트너 권한을 부여합니다.</p></div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {[ { id: 'pending', label: '심사 대기중', icon: <Clock size={16} /> }, { id: 'approved', label: '승인 완료', icon: <CheckCircle size={16} /> }, { id: 'rejected', label: '반려/거절', icon: <XCircle size={16} /> } ].map(tab => (
                            <button key={tab.id} onClick={() => setAppFilter(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: `1px solid ${appFilter === tab.id ? '#111827' : '#D1D5DB'}`, backgroundColor: appFilter === tab.id ? '#111827' : '#FFF', color: appFilter === tab.id ? '#FFF' : '#4B5563', fontSize: '13px', cursor: 'pointer', fontWeight: appFilter === tab.id ? 'bold' : 'normal', borderRadius: '6px', transition: '0.2s' }}>
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ backgroundColor: '#FFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px', cursor: 'default'}}>신청 일시</th>
                                    <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px', cursor: 'default'}}>신청자 계정 (이메일/이름)</th>
                                    <th style={{...styles.tableHeader, cursor: 'default'}}>판매 희망 카테고리</th>
                                    <th style={{...styles.tableHeader, cursor: 'default'}}>브랜드명 (활동명)</th>
                                    <th style={{...styles.tableHeader, cursor: 'default'}}>처리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingApps ? (
                                    <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>데이터를 불러오는 중입니다...</td></tr>
                                ) : (!applications || applications.length === 0) ? (
                                    <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}><Store size={48} color="#E5E7EB" style={{ margin: '0 auto 12px auto', display: 'block' }} />해당 조건의 입점 신청 내역이 없습니다.</td></tr>
                                ) : (
                                    applications.map((app) => {
                                        const badge = getCategoryBadge(app.target_category);
                                        return (
                                            <tr key={app.id} style={{ transition: 'background-color 0.2s', ':hover': { backgroundColor: '#F9FAFB' } }}>
                                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>{new Date(app.created_at).toLocaleString()}</td>
                                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}><div style={{ fontWeight: 'bold', color: '#111' }}>{app.profiles?.name || '이름없음'}</div><div style={{ color: '#6B7280', fontSize: '12px' }}>{app.profiles?.email || '이메일없음'}</div></td>
                                                <td style={styles.tableCell}><span style={{ backgroundColor: badge.bg, color: badge.color, padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>{badge.label}</span></td>
                                                <td style={{...styles.tableCell, fontWeight: 'bold', color: '#0ea5e9'}}>{app.brand_name}</td>
                                                <td style={styles.tableCell}>
                                                    {appFilter === 'pending' ? (
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                                            <button onClick={() => handleApproveApp(app)} style={{ padding: '6px 14px', backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>승인 (상점개설)</button>
                                                            <button onClick={() => handleRejectApp(app.id)} style={{ padding: '6px 14px', backgroundColor: '#FFF', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>반려</button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: appFilter === 'approved' ? '#059669' : '#ef4444', fontWeight: 'bold' }}>{appFilter === 'approved' ? '승인완료' : '거절/반려됨'}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 2. 승인된 파트너 전용 관리 화면 */}
            {defaultTab === 'partners' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ ...styles.headerTitle, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Crown size={24}/> 활성 파트너 현황
                            </h2>
                            <p style={styles.headerSub}>상점이 개설된 파트너 리스트입니다. (도메인, 운영 상태 확인 가능)</p>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>총 파트너: <span style={{color:'#0ea5e9', fontSize:'16px'}}>{approvedPartners?.length || 0}</span> 개소</div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #0ea5e9' }}>
                        <thead>
                            <tr>
                                <th style={{...styles.tableHeader, width: '50px', cursor: 'default'}}>No</th>
                                <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px', cursor: 'default'}}>파트너 계정 (이메일/이름)</th>
                                <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px', cursor: 'default'}}>상점명 / 도메인</th>
                                <th style={{...styles.tableHeader, textAlign: 'right', paddingRight: '16px', cursor: 'default'}}>보유 캐시</th>
                                <th style={{...styles.tableHeader, width: '120px', cursor: 'default'}}>상점 상태</th>
                                <th style={{...styles.tableHeader, width: '180px', cursor: 'default'}}>권한 제어</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingPartners ? (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>로딩 중...</td></tr>
                            ) : (!approvedPartners || approvedPartners.length === 0) ? (
                                // 🚨 에러 방어: 데이터가 null이거나 0일 때 map 함수를 타지 못하게 완벽 방어 처리
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>등록된 파트너가 없습니다.</td></tr>
                            ) : (
                                approvedPartners.map((p, idx) => {
                                    const shop = p.partner_shops && p.partner_shops.length > 0 ? p.partner_shops[0] : null;
                                    return (
                                        <tr key={p.id} style={{ backgroundColor: '#FFF', borderBottom: '1px solid #E5E7EB' }}>
                                            <td style={styles.tableCell}>{idx + 1}</td>
                                            <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                                <div style={{ fontWeight: 'bold', color: '#333' }}>{p.email}</div><div style={{ color: '#888', fontSize: '11px' }}>{p.name || '이름미상'}</div>
                                            </td>
                                            <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                                <div style={{ fontWeight: '900', color: '#0ea5e9' }}>{shop?.shop_name || '미설정 상점'}</div>
                                                {shop?.custom_domain && <div style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}><ExternalLink size={10}/> bokhouse.com/p/{shop.custom_domain}</div>}
                                            </td>
                                            <td style={{...styles.tableCell, textAlign: 'right', paddingRight: '16px', fontWeight: 'bold', color: '#059669'}}>{p.cash_balance?.toLocaleString() || 0} C</td>
                                            <td style={styles.tableCell}>
                                                {shop?.is_active ? <span style={{color: '#059669', fontWeight: 'bold', backgroundColor: '#ECFDF5', padding: '4px 8px', borderRadius: '4px'}}>운영중</span> : <span style={{color: '#ef4444', fontWeight: 'bold', backgroundColor: '#FEF2F2', padding: '4px 8px', borderRadius: '4px'}}>비활성/정지</span>}
                                            </td>
                                            <td style={styles.tableCell}>
                                                <button onClick={(e) => handleUpgradePartner(e, p.id, 'partner')} style={{...styles.actionBtnRed, padding: '6px 12px'}}>권한 회수 (일반회원 강등)</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 3. 전체 회원 리스트 관리 화면 */}
            {defaultTab === 'users' && (
                <div className="fade-in">
                    <div><h2 style={styles.headerTitle}>전체 회원 리스트 및 수동 권한 제어</h2><p style={styles.headerSub}>플랫폼에 가입한 모든 회원을 검색하고 등급별로 분류하여 관리합니다.</p></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#F9FAFB', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={16} color="#6B7280" />
                                <select 
                                    value={quickRole} 
                                    onChange={(e) => { setQuickRole(e.target.value); setPage(1); }}
                                    style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', outline: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#374151' }}
                                >
                                    <option value="all">전체 등급 보기</option>
                                    <option value="user">1. 일반회원</option>
                                    <option value="vip">2. 구독회원 (VIP)</option>
                                    <option value="partner">3. 스토어 파트너</option>
                                    <option value="blocked">차단/탈퇴대기 회원</option>
                                </select>
                            </div>

                            <div style={{ width: '1px', height: '24px', backgroundColor: '#D1D5DB' }}></div>

                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #D1D5DB', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#FFF' }}>
                                <select value={searchType} onChange={(e)=>setSearchType(e.target.value)} style={{ padding: '8px', border: 'none', borderRight: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                                    <option value="email">이메일/아이디</option>
                                    <option value="name">이름</option>
                                </select>
                                <input 
                                    type="text" 
                                    placeholder="검색어를 입력하세요..." 
                                    value={searchInput} 
                                    onChange={(e) => setSearchInput(e.target.value)} 
                                    style={{ padding: '8px 12px', border: 'none', fontSize: '13px', outline: 'none', width: '220px' }} 
                                />
                                <div style={{ padding: '0 12px', color: '#9CA3AF' }}><Search size={16} /></div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ fontSize: '13px', color: '#4B5563' }}>검색결과: <span style={{fontWeight: 'bold', color: '#0ea5e9', fontSize: '15px'}}>{data?.totalCount?.toLocaleString() || 0}</span> 명</div>
                            <button style={{...styles.actionBtn, padding: '6px 12px'}}>엑셀저장 (Excel)</button>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #333' }}>
                        <thead>
                            <tr>
                                <th style={{...styles.tableHeader, width: '60px'}} onClick={() => handleSort('id')} onMouseEnter={(e)=>e.target.style.backgroundColor='#E5E7EB'} onMouseLeave={(e)=>e.target.style.backgroundColor='#F9FAFB'}>
                                    번호
                                </th>
                                <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}} onClick={() => handleSort('email')} onMouseEnter={(e)=>e.target.style.backgroundColor='#E5E7EB'} onMouseLeave={(e)=>e.target.style.backgroundColor='#F9FAFB'}>
                                    아이디 (이메일) {getSortIcon('email')}
                                </th>
                                <th style={{...styles.tableHeader, width: '120px'}} onClick={() => handleSort('name')} onMouseEnter={(e)=>e.target.style.backgroundColor='#E5E7EB'} onMouseLeave={(e)=>e.target.style.backgroundColor='#F9FAFB'}>
                                    이름 {getSortIcon('name')}
                                </th>
                                <th style={{...styles.tableHeader, width: '100px'}} onClick={() => handleSort('role')} onMouseEnter={(e)=>e.target.style.backgroundColor='#E5E7EB'} onMouseLeave={(e)=>e.target.style.backgroundColor='#F9FAFB'}>
                                    등급 {getSortIcon('role')}
                                </th>
                                <th style={{...styles.tableHeader, width: '80px'}} onClick={() => handleSort('is_blocked')} onMouseEnter={(e)=>e.target.style.backgroundColor='#E5E7EB'} onMouseLeave={(e)=>e.target.style.backgroundColor='#F9FAFB'}>
                                    상태 {getSortIcon('is_blocked')}
                                </th>
                                <th style={{...styles.tableHeader, width: '120px', textAlign: 'right', paddingRight: '16px'}} onClick={() => handleSort('cash_balance')} onMouseEnter={(e)=>e.target.style.backgroundColor='#E5E7EB'} onMouseLeave={(e)=>e.target.style.backgroundColor='#F9FAFB'}>
                                    보유 캐시 {getSortIcon('cash_balance')}
                                </th>
                                <th style={{...styles.tableHeader, width: '120px'}} onClick={() => handleSort('created_at')} onMouseEnter={(e)=>e.target.style.backgroundColor='#E5E7EB'} onMouseLeave={(e)=>e.target.style.backgroundColor='#F9FAFB'}>
                                    가입일 {getSortIcon('created_at')}
                                </th>
                                <th style={{...styles.tableHeader, width: '180px', cursor: 'default'}}>
                                    권한 관리
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>데이터 로딩 중...</td></tr>
                            ) : (!sortedUsersList || sortedUsersList.length === 0) ? (
                                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>조건에 일치하는 회원이 없습니다.</td></tr>
                            ) : (
                                sortedUsersList.map((u, idx) => (
                                    <tr key={u.id} style={{ backgroundColor: u.is_blocked ? '#fef2f2' : '#FFF' }}>
                                        <td style={styles.tableCell}>{pageSize * (page - 1) + idx + 1}</td>
                                        <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                            <div onClick={() => { setSelectedUser(u); setModalTab('info'); }} style={{ color: '#0ea5e9', cursor: 'pointer', fontWeight: 'bold' }}>{u.email}</div>
                                        </td>
                                        <td style={styles.tableCell}>{u.name || '-'}</td>
                                        <td style={styles.tableCell}>
                                            {u.role === 'admin' && '최고관리자'}{u.role === 'partner' && <span style={{color: '#0ea5e9', fontWeight: 'bold'}}>스토어 파트너</span>}{u.role === 'user' && (u.is_vip ? <span style={{color: '#d97706', fontWeight: 'bold'}}>VIP회원</span> : '일반회원')}
                                        </td>
                                        <td style={{...styles.tableCell, color: u.is_blocked ? '#ef4444' : '#333'}}>{u.is_blocked ? '차단' : '정상'}</td>
                                        <td style={{...styles.tableCell, textAlign: 'right', paddingRight: '16px', fontWeight: 'bold'}}>{u.cash_balance?.toLocaleString() || 0}</td>
                                        <td style={styles.tableCell}>{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td style={{...styles.tableCell, display: 'flex', gap: '4px', justifyContent: 'center'}}>
                                            <button onClick={() => { setSelectedUser(u); setModalTab('info'); }} style={styles.actionBtn}>[상세/메모]</button>
                                            <button onClick={(e) => handleUpgradePartner(e, u.id, u.role)} style={u.role === 'partner' ? styles.actionBtnRed : styles.actionBtnBlue}>{u.role === 'partner' ? '강등' : '파트너 승급'}</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...styles.actionBtn, padding: '6px 12px' }}>◀ 이전</button>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 8px' }}>{page} / {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...styles.actionBtn, padding: '6px 12px' }}>다음 ▶</button>
                    </div>

                    {/* 🚀 회원 상세 정보 모달 (캐시/결제 탭 완벽 연동) */}
                    {selectedUser && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                            <div style={{ width: '650px', backgroundColor: '#FFF', border: '1px solid #333', display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                                <div style={{ backgroundColor: '#1F2937', color: '#FFF', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{selectedUser.name || '이름없음'} ({selectedUser.email}) 님의 상세 관리</span>
                                    <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                                </div>
                                <div style={{ display: 'flex', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <button onClick={() => setModalTab('info')} style={{ flex: 1, padding: '12px', border: 'none', background: modalTab === 'info' ? '#FFF' : 'transparent', borderBottom: modalTab === 'info' ? '2px solid #0ea5e9' : 'none', fontWeight: modalTab === 'info' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px' }}><Settings size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 회원기본정보</button>
                                    <button onClick={() => { setModalTab('memo'); setMemoText(selectedUser.admin_memo || ''); }} style={{ flex: 1, padding: '12px', border: 'none', background: modalTab === 'memo' ? '#FFF' : 'transparent', borderBottom: modalTab === 'memo' ? '2px solid #0ea5e9' : 'none', fontWeight: modalTab === 'memo' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px' }}><FileText size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 관리자 메모</button>
                                    <button onClick={() => setModalTab('cash')} style={{ flex: 1, padding: '12px', border: 'none', background: modalTab === 'cash' ? '#FFF' : 'transparent', borderBottom: modalTab === 'cash' ? '2px solid #0ea5e9' : 'none', fontWeight: modalTab === 'cash' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px', color: modalTab === 'cash' ? '#0ea5e9' : '#333' }}><Wallet size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 캐시/결제 내역</button>
                                </div>
                                
                                <div style={{ padding: '24px', minHeight: '350px', maxHeight: '500px', overflowY: 'auto' }}>
                                    {/* 탭 1: 기본 정보 */}
                                    {modalTab === 'info' && (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <tbody>
                                                <tr><td style={{ backgroundColor: '#F9FAFB', padding: '12px', width: '120px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>이메일(ID)</td><td style={{ padding: '12px', border: '1px solid #E5E7EB' }}>{selectedUser.email}</td></tr>
                                                <tr><td style={{ backgroundColor: '#F9FAFB', padding: '12px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>가입일시</td><td style={{ padding: '12px', border: '1px solid #E5E7EB' }}>{new Date(selectedUser.created_at).toLocaleString()}</td></tr>
                                                <tr><td style={{ backgroundColor: '#F9FAFB', padding: '12px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>현재 보유 캐시</td><td style={{ padding: '12px', border: '1px solid #E5E7EB', fontWeight: 'bold', color: '#059669' }}>{selectedUser.cash_balance?.toLocaleString() || 0} C</td></tr>
                                                <tr><td style={{ backgroundColor: '#F9FAFB', padding: '12px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>계정 상태 제어</td><td style={{ padding: '12px', border: '1px solid #E5E7EB' }}><button onClick={(e) => handleToggleBlock(e, selectedUser.id, selectedUser.is_blocked)} style={{...(selectedUser.is_blocked ? styles.actionBtnRed : styles.actionBtnBlue), padding: '6px 12px'}}>{selectedUser.is_blocked ? '현재 차단됨 (클릭하여 해제)' : '정상 작동중 (클릭하여 차단)'}</button></td></tr>
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 탭 2: 메모 */}
                                    {modalTab === 'memo' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>※ 고객에게 노출되지 않는 관리자 전용 메모 공간입니다.</div>
                                            <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="이슈 사항, 블랙리스트 사유 등을 상세히 기록하세요." style={{ width: '100%', height: '150px', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '4px', outline: 'none', resize: 'vertical', fontSize: '13px' }} />
                                            <div style={{ textAlign: 'center' }}><button onClick={handleSaveMemo} disabled={isSavingMemo} style={{ ...styles.actionBtnBlue, padding: '8px 40px', fontSize: '13px' }}>{isSavingMemo ? '저장 중...' : '메모 저장하기'}</button></div>
                                        </div>
                                    )}

                                    {/* 탭 3: 캐시/결제 내역 관리 */}
                                    {modalTab === 'cash' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            
                                            {/* 수동 지급/차감 컨트롤 */}
                                            <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '16px', backgroundColor: '#F9FAFB' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>관리자 권한 캐시 제어</span>
                                                    <span style={{color: '#0ea5e9'}}>현재 잔액: {selectedUser.cash_balance?.toLocaleString() || 0} C</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                                    <select value={cashType} onChange={e => setCashType(e.target.value)} style={{ padding: '8px', border: '1px solid #CCC', borderRadius: '4px', fontSize: '12px', outline: 'none', backgroundColor: '#FFF' }}>
                                                        <option value="grant">지급하기 (+)</option>
                                                        <option value="deduct">차감하기 (-)</option>
                                                    </select>
                                                    <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="제어 금액 (숫자만)" style={{ flex: 1, padding: '8px', border: '1px solid #CCC', borderRadius: '4px', fontSize: '12px', outline: 'none' }} />
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <input type="text" value={cashMemo} onChange={e => setCashMemo(e.target.value)} placeholder="처리 사유 메모 (선택)" style={{ flex: 1, padding: '8px', border: '1px solid #CCC', borderRadius: '4px', fontSize: '12px', outline: 'none' }} />
                                                    <button onClick={handleCashSubmit} disabled={isSavingCash} style={{ padding: '8px 24px', backgroundColor: cashType === 'grant' ? '#059669' : '#ef4444', color: '#FFF', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', opacity: isSavingCash ? 0.6 : 1 }}>
                                                        <Save size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 적용
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 개인 결제/포인트 내역 테이블 */}
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '8px' }}>최근 결제 및 포인트 내역 (개인장부)</div>
                                                <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '1px solid #CCC' }}>
                                                                <th style={{ padding: '8px', textAlign: 'left' }}>일시</th>
                                                                <th style={{ padding: '8px', textAlign: 'center' }}>유형</th>
                                                                <th style={{ padding: '8px', textAlign: 'left' }}>상세 내역</th>
                                                                <th style={{ padding: '8px', textAlign: 'right' }}>금액</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {isLoadingTx ? (
                                                                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>장부 내역을 불러오는 중입니다...</td></tr>
                                                            ) : (!userTxList || userTxList.length === 0) ? (
                                                                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>조회된 결제/변동 내역이 없습니다.</td></tr>
                                                            ) : (
                                                                userTxList.map(tx => {
                                                                    const isPlus = tx.amount > 0;
                                                                    let badgeLabel = '기타변동';
                                                                    let badgeColor = '#666';

                                                                    if (tx.trade_type === 'sell') { badgeLabel = '판매수익'; badgeColor = '#0ea5e9'; }
                                                                    else if (tx.trade_type === 'buy') { badgeLabel = '상품결제'; badgeColor = '#ef4444'; }
                                                                    else if (tx.trade_type === 'charge' || tx.trade_type === 'admin_grant') { badgeLabel = '충전/지급'; badgeColor = '#059669'; }
                                                                    else if (tx.trade_type === 'admin_deduct') { badgeLabel = '관리자차감'; badgeColor = '#ef4444'; }
                                                                    else if (tx.trade_type === 'subscription') { badgeLabel = '구독결제'; badgeColor = '#8B5CF6'; }
                                                                    else if (tx.trade_type === 'settlement' || tx.trade_type === 'withdraw') { badgeLabel = '정산/출금'; badgeColor = '#D97706'; }

                                                                    return (
                                                                        <tr key={tx.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                                                            <td style={{ padding: '8px', color: '#666' }}>{new Date(tx.created_at).toLocaleString()}</td>
                                                                            <td style={{ padding: '8px', textAlign: 'center' }}><span style={{color: badgeColor, fontWeight: 'bold'}}>{badgeLabel}</span></td>
                                                                            <td style={{ padding: '8px', color: '#333' }}>{tx.description}</td>
                                                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: isPlus ? '#059669' : '#ef4444' }}>
                                                                                {isPlus ? '+' : ''}{tx.amount.toLocaleString()} C
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}