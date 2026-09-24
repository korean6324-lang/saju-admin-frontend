// src/components/admin/AdminCash.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { Search, CheckCircle2, ArrowRightLeft, Bell, CreditCard, Download } from 'lucide-react'; 

export default function AdminCash() {
    const queryClient = useQueryClient();

    // 트랜잭션 내역 상태 관리
    const [txPage, setTxPage] = useState(1);
    const txPageSize = 15;
    
    // 🚀 [수정] 결제/정산 종류별 필터 상태 (all, point, subscription, item, settlement)
    const [txFilter, setTxFilter] = useState('all'); 

    // ==========================================================
    // 1. [유지] 무통장 입금 승인 대기열 가져오기 및 처리
    // ==========================================================
    const { data: pendingRequests, refetch: refetchRequests } = useQuery({
        queryKey: ['pendingCashRequests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cash_charge_requests')
                .select('*, profiles:user_id(email, name)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("🚨 승인 대기열 불러오기 에러:", error);
                return [];
            }
            return data;
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
    // 2. [유지] 파트너 정산(출금) 승인 대기열 가져오기 및 처리
    // ==========================================================
    const { data: pendingWithdrawals, refetch: refetchWithdrawals } = useQuery({
        queryKey: ['pendingWithdrawals'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('partner_withdrawals')
                .select('*, profiles:partner_id(email, name)')
                .eq('status', 'pending')
                .order('created_at', { ascending: true }); 
            
            if (error) {
                console.error("🚨 출금 대기열 불러오기 에러:", error);
                return [];
            }
            return data;
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
    // 🚀 3. [신규] 전체 캐시 트랜잭션 내역 조회 (종류별 필터링 고도화)
    // ==========================================================
    const { data: transactionsData, isLoading: isLoadingTx } = useQuery({
        queryKey: ['cashTransactions', txPage, txPageSize, txFilter],
        queryFn: async () => {
            const from = (txPage - 1) * txPageSize;
            const to = from + txPageSize - 1;

            let query = supabase.from('cash_transactions').select('*, profiles:user_id(email, name)', { count: 'exact' });
            
            // 🚀 결제 종류별 필터 적용 
            if (txFilter === 'point') {
                // 충전, 포인트, 수동지급, 수동차감
                query = query.in('transaction_type', ['charge', 'point', 'admin_grant', 'admin_deduct']);
            } else if (txFilter === 'subscription') {
                // 구독 결제
                query = query.or('transaction_type.eq.subscription,description.ilike.%구독%');
            } else if (txFilter === 'item') {
                // 단건 상품 결제 (사주, 타로 등)
                query = query.in('transaction_type', ['pay', 'item_purchase']);
            } else if (txFilter === 'settlement') {
                // 파트너 정산 및 출금
                query = query.in('transaction_type', ['settlement', 'withdraw']);
            }

            const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
            if (error) {
                console.error("🚨 트랜잭션 내역 로드 에러:", error);
                return { transactions: [], totalCount: 0 }; 
            }
            return { transactions: data, totalCount: count || 0 };
        },
        keepPreviousData: true
    });

    // ==========================================================
    // 🎨 스타일 정의 (불필요한 폼 스타일 제거 및 최적화)
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '32px' },
        
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '13px' },
        tableCell: { padding: '10px 8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
        actionBtn: { padding: '6px 12px', border: '1px solid #CCC', backgroundColor: '#FFF', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', color: '#333', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }
    };

    const txList = transactionsData?.transactions || [];
    const totalTxPages = Math.ceil((transactionsData?.totalCount || 0) / txPageSize) || 1;

    // 🚀 [신규] 유형별 뱃지 렌더링 함수
    const getTypeBadge = (type, desc = '') => {
        if (['charge', 'point', 'admin_grant'].includes(type)) return <span style={{color: '#2563EB', fontWeight: 'bold'}}>포인트 충전(+)</span>;
        if (['admin_deduct'].includes(type)) return <span style={{color: '#ef4444', fontWeight: 'bold'}}>포인트 차감(-)</span>;
        if (type === 'subscription' || desc.includes('구독')) return <span style={{color: '#8B5CF6', fontWeight: 'bold'}}>구독 결제(-)</span>;
        if (['pay', 'item_purchase'].includes(type)) return <span style={{color: '#059669', fontWeight: 'bold'}}>건별 결제(-)</span>;
        if (['settlement', 'withdraw'].includes(type)) return <span style={{color: '#D97706', fontWeight: 'bold'}}>스토어 정산</span>;
        return <span style={{color: '#6B7280', fontWeight: 'bold'}}>기타 변동</span>;
    };

    return (
        <div style={styles.container} className="fade-in">
            <div>
                <h2 style={styles.headerTitle}>결제 및 정산 포인트 관리</h2>
                <p style={styles.headerSub}>[정산관리 &gt; 정산 및 포인트] 플랫폼 내에서 발생한 포인트 충전, 상품/구독 결제 내역 및 파트너 정산 흐름을 통합 조회합니다.</p>
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
                                <th style={styles.tableHeader}>파트너 계정 (이메일/이름)</th>
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
                                        <div style={{ fontWeight: 'bold', color: '#111' }}>{req.profiles?.email || '알수없음'}</div>
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
                                        <button onClick={() => handleApproveWithdrawal(req)} style={{ padding: '6px 12px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>승인 및 입금완료</button>
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
                                <th style={styles.tableHeader}>계정(이메일)</th>
                                <th style={styles.tableHeader}>입금자명</th>
                                <th style={{...styles.tableHeader, textAlign: 'right', paddingRight: '16px'}}>신청 금액</th>
                                <th style={styles.tableHeader}>처리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRequests.map(req => (
                                <tr key={req.id} style={{ backgroundColor: '#F0FDF4' }}>
                                    <td style={styles.tableCell}>{new Date(req.created_at).toLocaleString()}</td>
                                    <td style={{...styles.tableCell, fontWeight: 'bold'}}>{req.profiles?.email || '알수없음'}</td>
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

            {/* 🚀 전체 캐시 트랜잭션 및 종류별 필터 탭 */}
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
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>관련 유저 (이메일/이름)</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>상세 내역 (상품명 등)</th>
                        <th style={{...styles.tableHeader, width: '140px', textAlign: 'right', paddingRight: '16px'}}>결제/변동 금액</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoadingTx ? (
                        <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: '#999', fontSize:'13px' }}>결제 및 정산 데이터를 불러오는 중입니다...</td></tr>
                    ) : txList.length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: '#999', fontSize:'13px' }}>해당 조건의 결제/캐시 변동 내역이 없습니다.</td></tr>
                    ) : (
                        txList.map((tx) => (
                            <tr key={tx.id} style={{ backgroundColor: '#FFF', transition: 'background-color 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.backgroundColor='#F9FAFB'} onMouseLeave={(e)=>e.currentTarget.style.backgroundColor='#FFF'}>
                                <td style={styles.tableCell}>{new Date(tx.created_at).toLocaleString()}</td>
                                
                                <td style={{...styles.tableCell, fontSize: '13px'}}>
                                    {getTypeBadge(tx.transaction_type, tx.description)}
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                    <div style={{ fontWeight: 'bold', color: '#111' }}>{tx.profiles?.email || '알수없음'}</div>
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
        </div>
    );
}