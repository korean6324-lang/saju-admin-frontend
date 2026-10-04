// src/components/admin/AdminCash.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function AdminCash() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed'

    // ==========================================================
    // 1. 환전 신청 내역 조회 (DB 연동)
    // ==========================================================
    const { data: exchangeRequests = [], isLoading } = useQuery({
        queryKey: ['adminExchangeRequests', activeTab],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('energy_transactions')
                .select('*, profiles:user_id(email, name)')
                .eq('trade_type', 'exchange')
                .eq('status', activeTab)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // ==========================================================
    // 2. 관리자 승인 (송금 완료 처리)
    // ==========================================================
    const handleApprove = async (id) => {
        if (!window.confirm("고객 계좌로 송금을 완료하셨습니까?\n(승인 처리 시 상태가 '완료'로 변경됩니다.)")) return;
        try {
            const { error } = await supabase.from('energy_transactions').update({ status: 'completed' }).eq('id', id);
            if (error) throw error;
            
            alert("✅ 승인 및 송금 완료 처리되었습니다.");
            queryClient.invalidateQueries(['adminExchangeRequests']);
        } catch (error) {
            alert("❌ 처리 중 오류가 발생했습니다.");
        }
    };

    // ==========================================================
    // 3. 관리자 반려 (에너지 환불/롤백 처리)
    // ==========================================================
    const handleReject = async (tx) => {
        if (!window.confirm("이 환전 신청을 거절(반려)하시겠습니까?\n(반려 시 차감되었던 에너지가 고객의 지갑으로 즉시 환불됩니다.)")) return;
        try {
            // 1. 고객에게 에너지를 다시 지급 (롤백)
            const { error: rpcError } = await supabase.rpc('process_energy_transaction', {
                p_user_id: tx.user_id,
                p_amount: Math.abs(tx.amount), // 음수(-)로 저장된 출금액을 양수(+)로 변환하여 복구
                p_trade_type: 'admin',
                p_description: '환전 신청 반려 (에너지 환불)',
                p_status: 'completed'
            });

            if (rpcError) throw rpcError;

            // 2. 해당 신청 내역의 상태를 'rejected'로 변경
            const { error: updateError } = await supabase.from('energy_transactions').update({ status: 'rejected' }).eq('id', tx.id);
            if (updateError) throw updateError;
            
            alert("✅ 환전이 반려되었으며, 에너지가 고객에게 환불 처리되었습니다.");
            queryClient.invalidateQueries(['adminExchangeRequests']);
        } catch (error) {
            console.error(error);
            alert("❌ 처리 중 시스템 오류가 발생했습니다.");
        }
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
                
                .ios-btn-micro { border: none; background: #F2F2F7; color: #007AFF; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap; }
                .ios-btn-micro:active { transform: scale(0.95); opacity: 0.8; }
                .ios-btn-micro.success { background: #34C759; color: #FFFFFF; }
                .ios-btn-micro.danger { color: #FF3B30; background: #FFE5E5; }
            `}} />

            <div>
                <h2 className="ios-title">에너지 환전(정산) 관리</h2>
                <p className="ios-desc">고객이 신청한 에너지 환전 요청 내역을 확인하고 승인/반려를 처리합니다.</p>
            </div>

            <div className="ios-segment">
                <div className={`ios-segment-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                    <Clock size={14}/> 승인 대기중
                </div>
                <div className={`ios-segment-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
                    <CheckCircle2 size={14}/> 송금/처리 완료
                </div>
            </div>

            <div className="ios-table-wrap">
                <table className="ios-table">
                    <thead>
                        <tr>
                            <th className="ios-th">신청 일시</th>
                            <th className="ios-th">신청 회원 계정</th>
                            <th className="ios-th" style={{ textAlign: 'right' }}>환전 신청액 (E)</th>
                            <th className="ios-th" style={{ textAlign: 'right' }}>실 입금액 (원)</th>
                            <th className="ios-th">입금 계좌 정보</th>
                            <th className="ios-th" style={{ textAlign: 'right', paddingRight: '16px' }}>관리 및 상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" className="ios-td" style={{ textAlign: 'center', padding: '60px', color: '#8E8E93' }}>데이터 동기화 중...</td></tr>
                        ) : exchangeRequests.length === 0 ? (
                            <tr><td colSpan="6" className="ios-td" style={{ textAlign: 'center', padding: '60px', color: '#8E8E93' }}>{activeTab === 'pending' ? '대기 중인 환전 신청 내역이 없습니다.' : '완료된 정산 내역이 없습니다.'}</td></tr>
                        ) : (
                            exchangeRequests.map(tx => {
                                const requestAmount = Math.abs(tx.amount); // DB엔 출금이라 음수(-)로 저장되어 있으므로 절댓값 처리
                                const realAmount = Math.floor(requestAmount * 0.95); // 수수료 5% 제외 실제 송금액
                                
                                return (
                                    <tr key={tx.id} className="ios-tr">
                                        <td className="ios-td" style={{ fontSize: '11px', color: '#8E8E93' }}>
                                            {new Date(tx.created_at).toLocaleString()}
                                        </td>
                                        <td className="ios-td">
                                            <div style={{ fontWeight: '600' }}>{tx.profiles?.name || '이름미상'}</div>
                                            <div style={{ fontSize: '11px', color: '#8E8E93' }}>{tx.profiles?.email}</div>
                                        </td>
                                        <td className="ios-td" style={{ textAlign: 'right', fontWeight: '700', color: '#FF9500' }}>
                                            {requestAmount.toLocaleString()} E
                                        </td>
                                        <td className="ios-td" style={{ textAlign: 'right', fontWeight: '800', color: '#34C759' }}>
                                            ₩ {realAmount.toLocaleString()}
                                        </td>
                                        <td className="ios-td" style={{ fontSize: '12px', fontWeight: '600', color: '#1C1C1E' }}>
                                            {tx.bank_info}
                                        </td>
                                        <td className="ios-td" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                            {activeTab === 'pending' ? (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button className="ios-btn-micro success" onClick={() => handleApprove(tx.id)}>송금 완료</button>
                                                    <button className="ios-btn-micro danger" onClick={() => handleReject(tx)}>거절(환불)</button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#34C759' }}><CheckCircle2 size={12} style={{verticalAlign:'middle', marginRight:'2px'}}/> 완료됨</span>
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