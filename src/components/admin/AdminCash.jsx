// src/components/admin/AdminCash.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, Copy } from 'lucide-react';

export default function AdminCash() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected'

    // ==========================================================
    // 1. 환전 신청 내역 조회 (최신 확장 테이블 연동)
    // ==========================================================
    const { data: exchangeRequests = [], isLoading } = useQuery({
        queryKey: ['adminExchangeRequests', activeTab],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('exchange_requests')
                .select('*, profiles:user_id(email, name)')
                .eq('status', activeTab)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // ==========================================================
    // 2. 관리자 승인 (송금 완료 처리 및 장부 확정)
    // ==========================================================
    const handleApprove = async (id, userName, amount) => {
        if (!window.confirm(`[${userName}] 님의 전자지갑/계좌로 ${Math.floor(amount * 0.95).toLocaleString()}원에 해당하는 송금을 완료하셨습니까?\n(승인 시 상태가 완료로 변경됩니다.)`)) return;
        
        try {
            // 안전한 RPC 트랜잭션 호출
            const { error } = await supabase.rpc('approve_exchange_request', { p_request_id: id });
            if (error) throw error;
            
            alert("✅ 환전 승인 및 송금 완료 처리가 완료되었습니다.");
            queryClient.invalidateQueries(['adminExchangeRequests']);
        } catch (error) {
            alert(`❌ 처리 중 오류가 발생했습니다: ${error.message}`);
        }
    };

    // ==========================================================
    // 3. 관리자 반려 (반려 사유 기록 및 포인트 환불 장부 처리)
    // ==========================================================
    const handleReject = async (id, amount) => {
        const reason = window.prompt("반려 사유를 입력해주세요.\n(반려 시 차감되었던 포인트가 고객에게 다시 환불됩니다.)", "지갑 주소/계좌 정보 오류");
        if (reason === null) return; 
        
        try {
            // 안전한 RPC 트랜잭션 호출 (환불 및 사유 기록 동시 처리)
            const { error } = await supabase.rpc('reject_exchange_request', { 
                p_request_id: id, 
                p_reason: reason 
            });
            if (error) throw error;
            
            alert(`✅ 반려 처리 및 ${amount.toLocaleString()} P 환불이 완료되었습니다.`);
            queryClient.invalidateQueries(['adminExchangeRequests']);
        } catch (error) {
            alert(`❌ 처리 중 오류가 발생했습니다: ${error.message}`);
        }
    };

    // ==========================================================
    // 4. 전자지갑 주소/계좌번호 원클릭 복사
    // ==========================================================
    const handleCopyAddress = (bankInfo) => {
        // "지갑: 0x123..." 형태에서 불필요한 텍스트 제거 후 복사
        const address = bankInfo.replace('지갑: ', '').trim();
        navigator.clipboard.writeText(address).then(() => {
            alert(`✅ 복사 성공: ${address}`);
        }).catch(() => {
            alert("❌ 복사에 실패했습니다. 직접 드래그하여 복사해주세요.");
        });
    };

    return (
        <div className="ios-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-wrap { width: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif; }
                .ios-title { font-size: 24px; font-weight: 800; color: #1C1C1E; margin: 0 0 6px 0; letter-spacing: -0.5px; }
                .ios-desc { font-size: 13px; color: #8E8E93; margin: 0 0 24px 0; font-weight: 500; }
                
                .ios-segment { display: inline-flex; background-color: #E5E5EA; border-radius: 8px; padding: 2px; margin-bottom: 24px; }
                .ios-segment-btn { padding: 6px 14px; font-size: 12px; font-weight: 600; color: #8E8E93; border-radius: 6px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 4px; }
                .ios-segment-btn.active { background-color: #FFFFFF; color: #1C1C1E; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
                
                .ios-table-wrap { background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
                .ios-table { width: 100%; border-collapse: collapse; }
                .ios-th { background-color: #F9F9FB; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #8E8E93; border-bottom: 0.5px solid #E5E5EA; }
                .ios-td { padding: 14px 16px; border-bottom: 0.5px solid #E5E5EA; font-size: 13px; color: #1C1C1E; font-weight: 500; vertical-align: middle; }
                .ios-tr:last-child .ios-td { border-bottom: none; }
                .ios-tr:hover { background-color: #F9F9FB; }
                
                .ios-btn-micro { border: none; background: #F2F2F7; color: #007AFF; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; }
                .ios-btn-micro:active { transform: scale(0.95); opacity: 0.8; }
                .ios-btn-micro.success { background: #34C759; color: #FFFFFF; }
                .ios-btn-micro.danger { color: #FF3B30; background: #FFE5E5; }
                .ios-btn-micro.outline { background: transparent; border: 1px solid #007AFF; color: #007AFF; }
            `}} />

            <div>
                <h2 className="ios-title">포인트 환전(출금) 정산</h2>
                <p className="ios-desc">고객의 환전 요청을 확인하고, 전자지갑/계좌로 송금한 뒤 승인 처리합니다.</p>
            </div>

            <div className="ios-segment">
                <div className={`ios-segment-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                    <Clock size={14}/> 환전 승인 대기중
                </div>
                <div className={`ios-segment-btn ${activeTab === 'approved' ? 'active' : ''}`} onClick={() => setActiveTab('approved')}>
                    <CheckCircle2 size={14}/> 송금/처리 완료
                </div>
                <div className={`ios-segment-btn ${activeTab === 'rejected' ? 'active' : ''}`} onClick={() => setActiveTab('rejected')}>
                    <XCircle size={14}/> 반려/환불 내역
                </div>
            </div>

            <div className="ios-table-wrap">
                <table className="ios-table">
                    <thead>
                        <tr>
                            <th className="ios-th">신청 일시</th>
                            <th className="ios-th">신청 회원 계정</th>
                            <th className="ios-th" style={{ textAlign: 'right' }}>환전 신청 포인트</th>
                            <th className="ios-th" style={{ textAlign: 'right' }}>실 송금액 (-5%)</th>
                            <th className="ios-th" style={{ textAlign: 'right' }}>전자지갑 / 계좌 정보</th>
                            <th className="ios-th" style={{ textAlign: 'right', paddingRight: '16px' }}>관리 및 상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" className="ios-td" style={{ textAlign: 'center', padding: '60px', color: '#8E8E93' }}>데이터 동기화 중...</td></tr>
                        ) : exchangeRequests.length === 0 ? (
                            <tr><td colSpan="6" className="ios-td" style={{ textAlign: 'center', padding: '60px', color: '#8E8E93' }}>
                                {activeTab === 'pending' ? '대기 중인 환전 신청 내역이 없습니다.' : '조회된 내역이 없습니다.'}
                            </td></tr>
                        ) : (
                            exchangeRequests.map(tx => {
                                const realAmount = Math.floor(tx.request_amount * 0.95); // 기존 로직 계승: 5% 수수료 제외
                                
                                return (
                                    <tr key={tx.id} className="ios-tr">
                                        <td className="ios-td" style={{ fontSize: '11px', color: '#8E8E93' }}>
                                            {new Date(tx.created_at).toLocaleString()}
                                        </td>
                                        <td className="ios-td">
                                            <div style={{ fontWeight: '600' }}>{tx.profiles?.name || '이름미상'}</div>
                                            <div style={{ fontSize: '11px', color: '#8E8E93' }}>{tx.profiles?.email}</div>
                                        </td>
                                        <td className="ios-td" style={{ textAlign: 'right', fontWeight: '700', color: '#D97706' }}>
                                            {tx.request_amount.toLocaleString()} P
                                        </td>
                                        <td className="ios-td" style={{ textAlign: 'right', fontWeight: '800', color: '#34C759' }}>
                                            ₩ {realAmount.toLocaleString()}
                                        </td>
                                        <td className="ios-td" style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                <div style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: '600', color: '#1C1C1E' }}>
                                                    {tx.bank_info}
                                                </div>
                                                <button className="ios-btn-micro outline" onClick={() => handleCopyAddress(tx.bank_info)}>
                                                    <Copy size={12}/> 복사
                                                </button>
                                            </div>
                                        </td>
                                        <td className="ios-td" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                            {activeTab === 'pending' ? (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button className="ios-btn-micro success" onClick={() => handleApprove(tx.id, tx.profiles?.name || '회원', tx.request_amount)}>송금 완료</button>
                                                    <button className="ios-btn-micro danger" onClick={() => handleReject(tx.id, tx.request_amount)}>거절(환불)</button>
                                                </div>
                                            ) : tx.status === 'rejected' ? (
                                                <div style={{ fontSize: '11px', color: '#8E8E93' }}>사유: {tx.reject_reason}</div>
                                            ) : (
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#34C759' }}><CheckCircle2 size={12} style={{verticalAlign:'middle', marginRight:'2px'}}/> 승인완료</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}