// src/components/admin/AdminCash.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { Search, CheckCircle2, ArrowRightLeft, Bell, CreditCard, Download, Settings, FileText, Wallet, Save, X, ScrollText } from 'lucide-react'; 

export default function AdminCash() {
    const queryClient = useQueryClient();

    // 트랜잭션 내역 상태 관리
    const [txPage, setTxPage] = useState(1);
    const txPageSize = 15;
    
    // 결제/정산 종류별 필터 상태
    const [txFilter, setTxFilter] = useState('all'); 

    // ==========================================================
    // 🚀 [추가] 유저 상세 모달 상태 관리
    // ==========================================================
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState('cash'); // info | memo | cash
    const [memoText, setMemoText] = useState('');
    const [isSavingMemo, setIsSavingMemo] = useState(false);
    
    // 모달 내 캐시/결제 관리용 상태
    const [cashAmount, setCashAmount] = useState('');
    const [cashType, setCashType] = useState('grant'); 
    const [cashMemo, setCashMemo] = useState('');
    const [isSavingCash, setIsSavingCash] = useState(false);
    const [userTxList, setUserTxList] = useState([]);
    const [isLoadingUserTx, setIsLoadingUserTx] = useState(false);

    // 🚨 유저 장부 모달 열기 함수 (기존 cash_transactions 장부로 롤백 및 연동)
    const openUserModal = async (userId) => {
        setIsUserModalOpen(true);
        setModalTab('cash'); // 정산 페이지이므로 캐시 탭을 기본으로 엽니다.
        setIsLoadingUserTx(true);
        
        try {
            // 1. 프로필 정보 조회
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (profileData) {
                setSelectedUser(profileData);
                setMemoText(profileData.admin_memo || '');
            }
            // 2. 해당 유저의 원본 장부(cash_transactions) 30건 조회
            const { data: txData } = await supabase.from('cash_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
            setUserTxList(txData || []);
        } catch (e) {
            console.error("장부 조회 에러:", e);
        } finally {
            setIsLoadingUserTx(false);
        }
    };

    // 모달 내부 기능 핸들러
    const handleToggleBlock = async (e, userId, isBlocked) => {
        e.stopPropagation(); 
        if (!window.confirm(`회원을 ${isBlocked ? "차단 해제" : "차단"}하시겠습니까?`)) return;
        try {
            await supabase.from('profiles').update({ is_blocked: !isBlocked }).eq('id', userId);
            setSelectedUser(prev => ({...prev, is_blocked: !isBlocked}));
        } catch (error) { alert("처리 실패"); }
    };

    const handleSaveMemo = async () => {
        if (!selectedUser) return;
        setIsSavingMemo(true);
        try {
            await supabase.from('profiles').update({ admin_memo: memoText }).eq('id', selectedUser.id);
            alert("✅ 메모가 저장되었습니다.");
            setSelectedUser(prev => ({...prev, admin_memo: memoText}));
        } catch (error) { alert("메모 저장 실패"); }
        finally { setIsSavingMemo(false); }
    };

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
            
            // 처리 후 기존 장부 다시 로드
            const { data: txData } = await supabase.from('cash_transactions').select('*').eq('user_id', selectedUser.id).order('created_at', { ascending: false }).limit(30);
            setUserTxList(txData || []);
            queryClient.invalidateQueries(['cashTransactions']);
            setCashAmount(''); setCashMemo('');
        } catch (error) { alert(`❌ 처리 실패: ${error.message}`); } 
        finally { setIsSavingCash(false); }
    };

    // ==========================================================
    // 1. 무통장 입금 승인 대기열 가져오기 및 처리
    // ==========================================================
    const { data: pendingRequests = [], refetch: refetchRequests } = useQuery({
        queryKey: ['pendingCashRequests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cash_charge_requests')
                .select('*, profiles:user_id(email, name)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("🚨 승인 대기열 불러오기 에러:", error);
                return []; // 에러 시 빈 배열 반환하여 map 에러 방지
            }
            return data || [];
        }
    });

    const handleApproveRequest = async (req) => {
        if (!window.confirm(`[${req.depositor_name}]님의 ${req.amount.toLocaleString()}원 입금을 확인하셨습니까?\n확인 즉시 고객에게 캐시가 지급됩니다.`)) return;

        try {
            const { error: updateErr } = await supabase.from('cash_charge_requests').update({ status: 'approved' }).eq('id', req.id);
            if (updateErr) throw updateErr;

            const { error: rpcErr } = await supabase.rpc('process_admin_cash_transaction', {
                p_target_user_id: req.user_id,
                p_amount: req.amount,
                p_transaction_type: 'charge',
                p_description: `무통장 입금 충전 (${req.depositor_name})`
            });
            if (rpcErr) throw rpcErr;

            alert('✅ 승인 및 캐시 지급이 완료되었습니다.');
            refetchRequests();
            queryClient.invalidateQueries(['cashTransactions']);
        } catch (error) {
            console.error("승인 에러:", error);
            const errMsg = error.message || error.details || error.hint || JSON.stringify(error);
            alert(`❌ 처리 실패: ${errMsg}`);
        }
    };

    const handleRejectRequest = async (reqId) => {
        if (!window.confirm("입금이 확인되지 않아 이 신청을 취소 처리하시겠습니까?")) return;
        try {
            await supabase.from('cash_charge_requests').update({ status: 'rejected' }).eq('id', reqId);
            refetchRequests();
        } catch (e) { alert("취소 중 오류가 발생했습니다."); }
    };

    // ==========================================================
    // 2. 파트너 정산(출금) 승인 대기열 가져오기 및 처리
    // ==========================================================
    const { data: pendingWithdrawals = [], refetch: refetchWithdrawals } = useQuery({
        queryKey: ['pendingWithdrawals'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('partner_withdrawals')
                .select('*, profiles:partner_id(email, name)')
                .eq('status', 'pending')
                .order('created_at', { ascending: true }); 
            
            if (error) {
                console.error("🚨 출금 대기열 불러오기 에러:", error);
                return []; // 에러 시 빈 배열 반환
            }
            return data || [];
        }
    });

    const handleApproveWithdrawal = async (req) => {
        if (!window.confirm(`[${req.profiles?.name || req.account_holder}] 파트너의 ${req.amount.toLocaleString()} C 출금을 승인하시겠습니까?\n승인 시 해당 파트너의 캐시가 즉시 차감 처리됩니다.`)) return;

        try {
            const { error: updateErr } = await supabase.from('partner_withdrawals').update({ status: 'completed' }).eq('id', req.id);
            if (updateErr) throw updateErr;

            const { error: rpcErr } = await supabase.rpc('process_admin_cash_transaction', {
                p_target_user_id: req.partner_id,
                p_amount: -req.amount,
                p_transaction_type: 'settlement',
                p_description: `수익금 출금 완료 (${req.bank_name})`
            });
            if (rpcErr) throw rpcErr;

            alert('✅ 출금 승인 및 캐시 차감이 완료되었습니다.');
            refetchWithdrawals();
            queryClient.invalidateQueries(['cashTransactions']);
        } catch (error) {
            console.error("출금 승인 에러:", error);
            alert(`❌ 처리 실패: ${error.message}`);
        }
    };

    const handleRejectWithdrawal = async (reqId) => {
        const memo = window.prompt("출금 신청을 반려하시겠습니까?\n반려 사유를 입력해주세요 (파트너에게 노출됩니다):");
        if (memo === null) return; 
        
        try {
            const { error } = await supabase.from('partner_withdrawals').update({ 
                status: 'rejected',
                admin_memo: memo || '관리자에 의해 반려됨'
            }).eq('id', reqId);
            
            if (error) throw error;
            alert('✅ 출금 신청이 반려되었습니다.');
            refetchWithdrawals();
        } catch (error) {
            alert(`❌ 처리 실패: ${error.message}`);
        }
    };

    // ==========================================================
    // 🚨 3. 전체 캐시 트랜잭션 내역 조회 (원래 테이블 cash_transactions 롤백)
    // ==========================================================
    const { data: transactionsData, isLoading: isLoadingTx } = useQuery({
        queryKey: ['cashTransactions', txPage, txPageSize, txFilter],
        queryFn: async () => {
            const from = (txPage - 1) * txPageSize;
            const to = from + txPageSize - 1;

            let query = supabase.from('cash_transactions').select('*, profiles:user_id(email, name)', { count: 'exact' });
            
            // 🚀 결제 종류별 필터 적용 
            if (txFilter === 'point') {
                query = query.in('transaction_type', ['charge', 'point', 'admin_grant', 'admin_deduct']);
            } else if (txFilter === 'subscription') {
                query = query.or('transaction_type.eq.subscription,description.ilike.%구독%');
            } else if (txFilter === 'item') {
                query = query.in('transaction_type', ['pay', 'item_purchase', 'buy']); // P2P 구매 반영
            } else if (txFilter === 'settlement') {
                query = query.in('transaction_type', ['settlement', 'withdraw', 'sell']); // P2P 판매 수익 반영
            }

            const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
            if (error) {
                console.error("🚨 트랜잭션 내역 로드 에러:", error);
                return { transactions: [], totalCount: 0 }; 
            }
            return { transactions: data || [], totalCount: count || 0 };
        },
        keepPreviousData: true
    });

    // ==========================================================
    // 🎨 스타일 정의 
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '32px' },
        
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '13px' },
        tableCell: { padding: '10px 8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
        actionBtn: { padding: '6px 12px', border: '1px solid #CCC', backgroundColor: '#FFF', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', color: '#333', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' },
        actionBtnBlue: { padding: '4px 8px', border: '1px solid #0ea5e9', backgroundColor: '#FFF', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: '#0ea5e9' },
        actionBtnRed: { padding: '4px 8px', border: '1px solid #ef4444', backgroundColor: '#FFF', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: '#ef4444' }
    };

    const txList = transactionsData?.transactions || [];
    const totalTxPages = Math.ceil((transactionsData?.totalCount || 0) / txPageSize) || 1;

    // 🚀 유형별 뱃지 렌더링 함수
    const getTypeBadge = (type, desc = '') => {
        if (['charge', 'point', 'admin_grant'].includes(type)) return <span style={{color: '#2563EB', fontWeight: 'bold'}}>포인트 충전(+)</span>;
        if (['admin_deduct'].includes(type)) return <span style={{color: '#ef4444', fontWeight: 'bold'}}>포인트 차감(-)</span>;
        if (type === 'subscription' || desc.includes('구독')) return <span style={{color: '#8B5CF6', fontWeight: 'bold'}}>구독 결제(-)</span>;
        if (['pay', 'item_purchase', 'buy'].includes(type)) return <span style={{color: '#059669', fontWeight: 'bold'}}>상품결제(-)</span>;
        if (['settlement', 'withdraw', 'sell'].includes(type)) return <span style={{color: '#D97706', fontWeight: 'bold'}}>스토어 정산(+)</span>;
        return <span style={{color: '#6B7280', fontWeight: 'bold'}}>기타 변동</span>;
    };

    return (
        <div style={styles.container} className="fade-in">
            <div>
                <h2 style={styles.headerTitle}>결제 및 정산 포인트 관리</h2>
                <p style={styles.headerSub}>[정산관리 &gt; 정산 및 포인트] 💡 내역의 이메일을 클릭하시면 해당 회원의 상세 장부 모달창이 열립니다.</p>
            </div>

            {/* 파트너 출금(정산) 승인 대기열 */}
            {pendingWithdrawals && pendingWithdrawals.length > 0 && (
                <div style={{ marginBottom: '32px', border: '2px solid #2563EB', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={16} /> 파트너 정산(출금) 승인 대기열 ({pendingWithdrawals.length}건)
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>신청일시</th>
                                <th style={styles.tableHeader}>파트너 계정 (이메일 클릭 시 장부)</th>
                                <th style={styles.tableHeader}>계좌 정보 (은행/계좌/예금주)</th>
                                <th style={{...styles.tableHeader, textAlign: 'right', paddingRight: '16px'}}>출금 신청액</th>
                                <th style={styles.tableHeader}>심사 및 처리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingWithdrawals.map(req => (
                                <tr key={req.id} style={{ backgroundColor: '#EFF6FF' }}>
                                    <td style={styles.tableCell}>{new Date(req.created_at).toLocaleString()}</td>
                                    <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                        {/* 🚨 [적용] 유저 이메일 클릭 시 모달 오픈 */}
                                        <div onClick={() => openUserModal(req.partner_id)} style={{ fontWeight: 'bold', color: '#2563EB', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {req.profiles?.email || '알수없음'} <ScrollText size={12} color="#D97706" />
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#666' }}>{req.profiles?.name || '이름미지정'}</div>
                                    </td>
                                    <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                        <div style={{ fontWeight: 'bold', color: '#2563EB' }}>{req.bank_name}</div>
                                        <div style={{ fontSize: '12px' }}>{req.account_number} ({req.account_holder})</div>
                                    </td>
                                    <td style={{...styles.tableCell, textAlign: 'right', paddingRight: '16px', fontWeight: 'bold', color: '#ef4444'}}>
                                        {req.amount.toLocaleString()} C
                                    </td>
                                    <td style={{...styles.tableCell, display: 'flex', justifyContent: 'center', gap: '4px', height: '100%', alignItems: 'center'}}>
                                        <button onClick={() => handleApproveWithdrawal(req)} style={{ padding: '6px 12px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>승인 및 지급</button>
                                        <button onClick={() => handleRejectWithdrawal(req.id)} style={{ padding: '6px 12px', backgroundColor: '#FFF', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>반려</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 무통장 입금 승인 대기열 */}
            {pendingRequests && pendingRequests.length > 0 && (
                <div style={{ marginBottom: '32px', border: '2px solid #059669', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', backgroundColor: '#059669', color: '#FFF', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell size={16} /> 무통장 입금 승인 대기열 ({pendingRequests.length}건)
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>신청일시</th>
                                <th style={styles.tableHeader}>계정 (이메일 클릭 시 장부)</th>
                                <th style={styles.tableHeader}>입금자명</th>
                                <th style={{...styles.tableHeader, textAlign: 'right', paddingRight: '16px'}}>신청 금액</th>
                                <th style={styles.tableHeader}>처리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRequests.map(req => (
                                <tr key={req.id} style={{ backgroundColor: '#F0FDF4' }}>
                                    <td style={styles.tableCell}>{new Date(req.created_at).toLocaleString()}</td>
                                    <td style={{...styles.tableCell, fontWeight: 'bold'}}>
                                        {/* 🚨 [적용] 유저 이메일 클릭 시 모달 오픈 */}
                                        <div onClick={() => openUserModal(req.user_id)} style={{ color: '#059669', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {req.profiles?.email || '알수없음'} <ScrollText size={12} color="#D97706" />
                                        </div>
                                    </td>
                                    <td style={{...styles.tableCell, color: '#0ea5e9', fontWeight: 'bold'}}>{req.depositor_name}</td>
                                    <td style={{...styles.tableCell, textAlign: 'right', paddingRight: '16px', fontWeight: 'bold', color: '#059669'}}>{req.amount.toLocaleString()} C</td>
                                    <td style={{...styles.tableCell, display: 'flex', justifyContent: 'center', gap: '4px'}}>
                                        <button onClick={() => handleApproveRequest(req)} style={{ padding: '6px 12px', backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>입금확인 및 지급</button>
                                        <button onClick={() => handleRejectRequest(req.id)} style={{ padding: '6px 12px', backgroundColor: '#FFF', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>취소</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 전체 캐시 트랜잭션 및 종류별 필터 탭 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px', borderBottom: '2px solid #E5E7EB', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '900', fontSize: '16px', marginRight: '16px', color: '#111' }}>
                        <ArrowRightLeft size={18} style={{verticalAlign:'middle', marginRight:'6px'}}/> 전체 결제 및 정산 내역
                    </span>
                    {[
                        { id: 'all', label: '전체 내역보기' },
                        { id: 'point', label: '포인트 충전 내역' },
                        { id: 'subscription', label: '구독 결제 내역' },
                        { id: 'item', label: '건별 결제 내역' },
                        { id: 'settlement', label: '파트너 정산 내역' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => { setTxFilter(tab.id); setTxPage(1); }}
                            style={{ 
                                padding: '8px 16px', 
                                border: `1px solid ${txFilter === tab.id ? '#111827' : '#D1D5DB'}`, 
                                backgroundColor: txFilter === tab.id ? '#111827' : '#FFF', 
                                color: txFilter === tab.id ? '#FFF' : '#4B5563', 
                                fontSize: '13px', cursor: 'pointer', 
                                fontWeight: txFilter === tab.id ? 'bold' : 'normal',
                                borderRadius: '4px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <button style={styles.actionBtn}>
                    <Download size={14} /> 엑셀저장 (Excel)
                </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{...styles.tableHeader, width: '180px'}}>결제/변동 일시</th>
                        <th style={{...styles.tableHeader, width: '130px'}}>유형 (구분)</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>관련 유저 (이메일 클릭 시 장부)</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>상세 내역 (상품명 등)</th>
                        <th style={{...styles.tableHeader, width: '140px', textAlign: 'right', paddingRight: '16px'}}>결제/변동 금액</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoadingTx ? (
                        <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: '#999', fontSize:'13px' }}>결제 및 정산 데이터를 불러오는 중...</td></tr>
                    ) : (!txList || txList.length === 0) ? (
                        <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: '#999', fontSize:'13px' }}>해당 조건의 결제/캐시 변동 내역이 없습니다.</td></tr>
                    ) : (
                        txList.map((tx) => (
                            <tr key={tx.id} style={{ backgroundColor: '#FFF', transition: 'background-color 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.backgroundColor='#F9FAFB'} onMouseLeave={(e)=>e.currentTarget.style.backgroundColor='#FFF'}>
                                <td style={styles.tableCell}>{new Date(tx.created_at).toLocaleString()}</td>
                                
                                <td style={{...styles.tableCell, fontSize: '13px'}}>
                                    {getTypeBadge(tx.transaction_type, tx.description)}
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                    {/* 🚨 [적용] 이메일 클릭 시 모달 오픈 */}
                                    <div onClick={() => openUserModal(tx.user_id)} style={{ fontWeight: 'bold', color: '#0ea5e9', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        {tx.profiles?.email || '알수없음'} <ScrollText size={12} color="#D97706" />
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>{tx.profiles?.name || ''}</div>
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px', color: '#444', fontWeight: '500'}}>
                                    {tx.description}
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'right', paddingRight: '16px', fontWeight: 'bold', fontSize: '14px', color: tx.amount > 0 ? '#059669' : '#ef4444'}}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} C
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* 페이징 UI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    총 조회된 내역: <span style={{ fontWeight: 'bold', color: '#111827' }}>{transactionsData?.totalCount?.toLocaleString() || 0}</span> 건
                </div>
                {totalTxPages > 1 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1} style={{ ...styles.actionBtn }}>◀ 이전</button>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', padding: '6px 12px' }}>{txPage} / {totalTxPages}</span>
                        <button onClick={() => setTxPage(p => Math.min(totalTxPages, p + 1))} disabled={txPage === totalTxPages} style={{ ...styles.actionBtn }}>다음 ▶</button>
                    </div>
                )}
            </div>

            {/* 🚀 [신규] 회원 상세 정보 및 개인 장부(결제) 모달창 */}
            {isUserModalOpen && selectedUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }}>
                    <div className="fade-in" style={{ width: '650px', backgroundColor: '#FFF', border: '1px solid #333', display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ backgroundColor: '#1F2937', color: '#FFF', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{selectedUser.name || '이름없음'} ({selectedUser.email}) 님의 상세 관리</span>
                            <button onClick={() => setIsUserModalOpen(false)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <button onClick={() => setModalTab('info')} style={{ flex: 1, padding: '12px', border: 'none', background: modalTab === 'info' ? '#FFF' : 'transparent', borderBottom: modalTab === 'info' ? '2px solid #0ea5e9' : 'none', fontWeight: modalTab === 'info' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px' }}><Settings size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 회원기본정보</button>
                            <button onClick={() => setModalTab('memo')} style={{ flex: 1, padding: '12px', border: 'none', background: modalTab === 'memo' ? '#FFF' : 'transparent', borderBottom: modalTab === 'memo' ? '2px solid #0ea5e9' : 'none', fontWeight: modalTab === 'memo' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px' }}><FileText size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 관리자 메모</button>
                            <button onClick={() => setModalTab('cash')} style={{ flex: 1, padding: '12px', border: 'none', background: modalTab === 'cash' ? '#FFF' : 'transparent', borderBottom: modalTab === 'cash' ? '2px solid #0ea5e9' : 'none', fontWeight: modalTab === 'cash' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px', color: modalTab === 'cash' ? '#0ea5e9' : '#333' }}><Wallet size={14} style={{verticalAlign:'middle', marginRight:'4px'}}/> 캐시/결제 내역 (장부)</button>
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
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '8px' }}>해당 회원의 개인 장부 (결제/수익)</div>
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
                                                    {isLoadingUserTx ? (
                                                        <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>장부 내역을 불러오는 중입니다...</td></tr>
                                                    ) : (!userTxList || userTxList.length === 0) ? (
                                                        <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>조회된 결제/변동 내역이 없습니다.</td></tr>
                                                    ) : (
                                                        userTxList.map(tx => {
                                                            const isPlus = tx.amount > 0;
                                                            let badgeLabel = '기타변동'; let badgeColor = '#666';
                                                            if (tx.transaction_type === 'sell') { badgeLabel = '판매수익'; badgeColor = '#0ea5e9'; }
                                                            else if (tx.transaction_type === 'buy') { badgeLabel = '상품결제'; badgeColor = '#ef4444'; }
                                                            else if (['charge', 'admin_grant', 'point'].includes(tx.transaction_type)) { badgeLabel = '충전/지급'; badgeColor = '#059669'; }
                                                            else if (tx.transaction_type === 'admin_deduct') { badgeLabel = '관리자차감'; badgeColor = '#ef4444'; }
                                                            else if (tx.transaction_type === 'subscription') { badgeLabel = '구독결제'; badgeColor = '#8B5CF6'; }
                                                            else if (['settlement', 'withdraw'].includes(tx.transaction_type)) { badgeLabel = '정산/출금'; badgeColor = '#D97706'; }

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
    );
}