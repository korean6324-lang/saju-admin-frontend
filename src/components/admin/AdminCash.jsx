// src/components/admin/AdminCash.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { Search, Save, CheckCircle2, ArrowRightLeft, Bell } from 'lucide-react'; // 🚨 Bell 아이콘 추가

export default function AdminCash() {
    const queryClient = useQueryClient();

    // 폼 상태 관리
    const [cashSearchTerm, setCashSearchTerm] = useState('');
    const [searchedUsers, setSearchedUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCashUserDropdown, setShowCashUserDropdown] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [cashAmount, setCashAmount] = useState('');
    const [cashType, setCashType] = useState('grant'); // 'grant' | 'deduct'
    const [cashMemo, setCashMemo] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // 트랜잭션 내역 상태 관리
    const [txPage, setTxPage] = useState(1);
    const txPageSize = 15;
    const [txFilter, setTxFilter] = useState('all'); // all, charge, pay, refund, settlement

    // ==========================================================
    // 🚨 [신규] 무통장 입금 승인 대기열 가져오기 및 처리
    // ==========================================================
    const { data: pendingRequests, refetch: refetchRequests } = useQuery({
        queryKey: ['pendingCashRequests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cash_charge_requests')
                .select('*, profiles:user_id(email, name)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (error) return [];
            return data;
        }
    });

    const handleApproveRequest = async (req) => {
        if (!window.confirm(`[${req.depositor_name}]님의 ${req.amount.toLocaleString()}원 입금을 확인하셨습니까?\n확인 즉시 고객에게 캐시가 지급됩니다.`)) return;

        try {
            // 1. 요청 상태를 '승인(approved)'으로 변경
            const { error: updateErr } = await supabase.from('cash_charge_requests').update({ status: 'approved' }).eq('id', req.id);
            if (updateErr) throw updateErr;

            // 2. 고객에게 캐시 자동 지급
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
    // 1. 디바운스 유저 검색 로직
    // ==========================================================
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (cashSearchTerm.length < 2) {
                setSearchedUsers([]);
                return;
            }
            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, email, cash_balance')
                    .ilike('email', `%${cashSearchTerm}%`)
                    .limit(10);
                if (!error && data) setSearchedUsers(data);
            } catch (err) { console.error(err); } 
            finally { setIsSearching(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [cashSearchTerm]);

    // ==========================================================
    // 2. 전체 캐시 트랜잭션 내역 조회 (React Query)
    // ==========================================================
    const { data: transactionsData, isLoading: isLoadingTx } = useQuery({
        queryKey: ['cashTransactions', txPage, txPageSize, txFilter],
        queryFn: async () => {
            const from = (txPage - 1) * txPageSize;
            const to = from + txPageSize - 1;

            let query = supabase.from('cash_transactions').select('*, profiles:user_id(email, name)', { count: 'exact' });
            
            if (txFilter !== 'all') {
                query = query.eq('transaction_type', txFilter);
            }

            const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
            if (error) return { transactions: [], totalCount: 0 }; 
            return { transactions: data, totalCount: count || 0 };
        },
        keepPreviousData: true
    });

    // ==========================================================
    // 3. 캐시 수동 지급/차감 처리 (🚨 에러 직관성 대폭 개선)
    // ==========================================================
    const handleCashSubmit = async () => {
        if (!selectedUserId) return alert("대상 유저를 정확히 선택해주세요.");
        const amountNum = Number(cashAmount);
        if (!cashAmount || isNaN(amountNum) || amountNum <= 0) return alert("금액은 0보다 커야 합니다.");
        setIsSaving(true);

        try {
            const finalAmount = cashType === 'grant' ? amountNum : -amountNum;
            const txTypeStr = cashType === 'grant' ? 'admin_grant' : 'admin_deduct';
            const defaultMemo = cashType === 'grant' ? '관리자 특별 지급' : '관리자 권한 차감';

            // RPC 실행
            const { data, error } = await supabase.rpc('process_admin_cash_transaction', {
                p_target_user_id: selectedUserId,
                p_amount: finalAmount,
                p_transaction_type: txTypeStr,
                p_description: cashMemo.trim() || defaultMemo
            });

            if (error) throw error;

            alert(`✅ 캐시 처리가 완료되었습니다.\n[처리 후 잔액: ${data.new_balance.toLocaleString()}C]`);
            
            queryClient.invalidateQueries(['adminUsers']);
            queryClient.invalidateQueries(['cashTransactions']); // 트랜잭션 내역 즉시 갱신
            
            setCashSearchTerm(''); setSelectedUserId(null); 
            setCashAmount(''); setCashMemo(''); setShowCashUserDropdown(false);

        } catch (error) {
            console.error("캐시 처리 에러 상세:", error);
            // 🚨 Object로 뭉뚱그려 나오던 에러를 강제로 풀어서 사용자에게 보여줍니다.
            const errMsg = error.message || error.details || error.hint || JSON.stringify(error);
            alert(`❌ 처리 실패: ${errMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================================
    // 🎨 엔터프라이즈 화이트 테마 스타일 (밀도 높은 폼)
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '24px' },
        
        formBox: { border: '2px solid #E5E7EB', display: 'flex', flexDirection: 'column', marginBottom: '20px' },
        formRow: { display: 'flex', borderBottom: '1px solid #E5E7EB' },
        formLabel: { width: '140px', backgroundColor: '#F9FAFB', padding: '12px 16px', fontWeight: 'bold', color: '#444', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', fontSize: '12px' },
        formContent: { flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', position: 'relative' },
        
        input: { padding: '6px 10px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', width: '100%', maxWidth: '300px' },
        radioLabel: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold' },
        submitBtn: { backgroundColor: '#0ea5e9', color: '#FFF', border: 'none', padding: '10px 40px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', borderRadius: '2px' },
        
        // 테이블 스타일
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '12px' },
        tableCell: { padding: '8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
        actionBtn: { padding: '4px 8px', border: '1px solid #CCC', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#333' }
    };

    const txList = transactionsData?.transactions || [];
    const totalTxPages = Math.ceil((transactionsData?.totalCount || 0) / txPageSize) || 1;

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 */}
            <div>
                <h2 style={styles.headerTitle}>사마캐시 운영 및 정산 관리</h2>
                <p style={styles.headerSub}>[운영 및 마케팅 &gt; 사마캐시 관리] 특정 유저에게 캐시를 직접 지급/차감하거나, 플랫폼 전체의 캐시 흐름을 조회합니다.</p>
            </div>

            {/* 🚨 [신규] 무통장 입금 승인 대기열 (최상단 강조) */}
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
                                    <td style={{...styles.tableCell, fontWeight: 'bold'}}>{req.profiles?.email}</td>
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

            {/* 1. 수동 지급/차감 폼 (엔터프라이즈 밀도형 표 구조) */}
            <div style={{ ...styles.formBox, borderBottom: 'none' }}>
                <div style={{ padding: '12px 16px', backgroundColor: '#1F2937', color: '#FFF', fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #E5E7EB' }}>
                    관리자 권한 캐시 제어
                </div>
                
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 처리 구분</div>
                    <div style={styles.formContent}>
                        <label style={styles.radioLabel}>
                            <input type="radio" name="cashType" checked={cashType === 'grant'} onChange={() => setCashType('grant')} />
                            <span style={{color: '#059669'}}>지급하기 (+)</span>
                        </label>
                        <span style={{margin: '0 8px', color:'#CCC'}}>|</span>
                        <label style={styles.radioLabel}>
                            <input type="radio" name="cashType" checked={cashType === 'deduct'} onChange={() => setCashType('deduct')} />
                            <span style={{color: '#ef4444'}}>차감하기 (-)</span>
                        </label>
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 대상 유저 검색</div>
                    <div style={styles.formContent}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${selectedUserId ? '#059669' : '#CCC'}`, backgroundColor: '#FFF' }}>
                                <Search size={14} color="#999" style={{marginLeft: '8px'}} />
                                <input 
                                    type="text" 
                                    placeholder="이메일을 두 글자 이상 입력..." 
                                    value={cashSearchTerm}
                                    onChange={(e) => {
                                        setCashSearchTerm(e.target.value);
                                        setSelectedUserId(null); 
                                        setShowCashUserDropdown(true);
                                    }}
                                    onFocus={() => setShowCashUserDropdown(true)}
                                    style={{ width: '100%', padding: '6px 8px', border: 'none', outline: 'none', fontSize: '12px' }}
                                />
                            </div>

                            {/* 드롭다운 */}
                            {showCashUserDropdown && cashSearchTerm.length >= 2 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#FFF', border: '1px solid #CCC', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                    {isSearching ? (
                                        <div style={{ padding: '8px', color: '#999', fontSize: '11px' }}>서버에서 조회 중...</div>
                                    ) : searchedUsers.length > 0 ? (
                                        searchedUsers.map(u => (
                                            <div 
                                                key={u.id} 
                                                onClick={() => {
                                                    setSelectedUserId(u.id);
                                                    setCashSearchTerm(u.email);
                                                    setShowCashUserDropdown(false);
                                                }}
                                                style={{ padding: '8px', borderBottom: '1px solid #EEE', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}
                                            >
                                                <span>{u.email}</span>
                                                <span style={{color: '#999'}}>{u.cash_balance?.toLocaleString()}C</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '8px', color: '#999', fontSize: '11px' }}>검색 결과 없음</div>
                                    )}
                                </div>
                            )}
                        </div>
                        {selectedUserId && <span style={{color: '#059669', fontWeight: 'bold'}}><CheckCircle2 size={14} style={{verticalAlign:'middle'}}/> 선택 완료</span>}
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 제어 금액</div>
                    <div style={styles.formContent}>
                        <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="0" style={styles.input} />
                        <span style={{fontWeight:'bold'}}>C</span>
                    </div>
                </div>

                <div style={{...styles.formRow, borderBottom: '1px solid #E5E7EB'}}>
                    <div style={styles.formLabel}>· 처리 사유 (메모)</div>
                    <div style={styles.formContent}>
                        <input type="text" value={cashMemo} onChange={e => setCashMemo(e.target.value)} placeholder="고객 노출용 상세 사유" style={{...styles.input, maxWidth: '500px'}} />
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <button onClick={handleCashSubmit} disabled={isSaving} style={{ ...styles.submitBtn, backgroundColor: cashType === 'grant' ? '#0ea5e9' : '#ef4444', opacity: isSaving ? 0.6 : 1 }}>
                    <Save size={14} style={{verticalAlign:'middle', marginRight:'6px'}}/>
                    {isSaving ? "처리 중..." : (cashType === 'grant' ? "선택 회원에게 캐시 지급" : "선택 회원의 캐시 차감")}
                </button>
            </div>

            {/* 2. 전체 캐시 트랜잭션 및 정산 내역 (확장성) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', marginRight: '16px' }}>
                        <ArrowRightLeft size={16} style={{verticalAlign:'middle'}}/> 캐시 변동 및 결제 전체 내역
                    </span>
                    {/* 확장성을 고려한 필터 탭 */}
                    {[
                        { id: 'all', label: '전체 내역' },
                        { id: 'charge', label: '고객 충전 내역' },
                        { id: 'pay', label: '상품 결제 내역' },
                        { id: 'settlement', label: '파트너 정산 내역' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => { setTxFilter(tab.id); setTxPage(1); }}
                            style={{ padding: '4px 12px', border: `1px solid ${txFilter === tab.id ? '#333' : '#CCC'}`, backgroundColor: txFilter === tab.id ? '#333' : '#FFF', color: txFilter === tab.id ? '#FFF' : '#666', fontSize: '12px', cursor: 'pointer', fontWeight: txFilter === tab.id ? 'bold' : 'normal' }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <button style={styles.actionBtn}>엑셀저장 (Excel)</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #333' }}>
                <thead>
                    <tr>
                        <th style={{...styles.tableHeader, width: '150px'}}>일시</th>
                        <th style={{...styles.tableHeader, width: '100px'}}>유형</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>관련 유저(이메일)</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>상세 내역 (상품명 등)</th>
                        <th style={{...styles.tableHeader, width: '120px', textAlign: 'right', paddingRight: '16px'}}>변동 금액</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoadingTx ? (
                        <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize:'12px' }}>결제/정산 데이터를 불러오는 중입니다...</td></tr>
                    ) : txList.length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize:'12px' }}>해당 조건의 결제/캐시 변동 내역이 없습니다. (cash_transactions 테이블 연동 필요)</td></tr>
                    ) : (
                        txList.map((tx) => (
                            <tr key={tx.id} style={{ backgroundColor: '#FFF' }}>
                                <td style={styles.tableCell}>{new Date(tx.created_at).toLocaleString()}</td>
                                
                                <td style={{...styles.tableCell, fontWeight: 'bold', color: tx.transaction_type?.includes('grant') || tx.transaction_type?.includes('charge') ? '#059669' : '#ef4444'}}>
                                    {tx.transaction_type === 'charge' && '충전(+)'}
                                    {tx.transaction_type === 'pay' && '결제(-)'}
                                    {tx.transaction_type === 'settlement' && '스토어 정산(-)'}
                                    {tx.transaction_type === 'admin_grant' && '수동 지급(+)'}
                                    {tx.transaction_type === 'admin_deduct' && '수동 차감(-)'}
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                    {tx.profiles?.email || '알수없음'}
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px', color: '#666'}}>
                                    {tx.description}
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'right', paddingRight: '16px', fontWeight: 'bold'}}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} C
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* 페이징 UI */}
            {totalTxPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                    <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1} style={{ ...styles.actionBtn, padding: '6px 12px' }}>◀ 이전</button>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 8px' }}>{txPage} / {totalTxPages}</span>
                    <button onClick={() => setTxPage(p => Math.min(totalTxPages, p + 1))} disabled={txPage === totalTxPages} style={{ ...styles.actionBtn, padding: '6px 12px' }}>다음 ▶</button>
                </div>
            )}
        </div>
    );
}