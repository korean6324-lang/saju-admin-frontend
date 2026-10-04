// src/components/admin/AdminDeposit.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminDeposit() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected'

    // ==========================================================
    // 1. 충전(입금) 요청 내역 조회 (DB 연동)
    // ==========================================================
    const { data: deposits = [], isLoading } = useQuery({
        queryKey: ['adminDepositRequests', activeTab],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('deposit_requests')
                .select('*, profiles:user_id(email, name)')
                .eq('status', activeTab)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // ==========================================================
    // 2. 관리자 승인 (입금 확인 및 포인트 자동 지급)
    // ==========================================================
    const handleApprove = async (id, depositorName, amount) => {
        if (!window.confirm(`[${depositorName}] 님의 ${amount.toLocaleString()}원 실제 입금을 확인하셨습니까?\n(승인 시 해당 회원에게 즉시 포인트가 지급됩니다.)`)) return;
        
        try {
            // DB 내부에 만들어둔 안전한 RPC 트랜잭션 함수 호출 (상태변경 + 포인트지급 동시처리)
            const { error } = await supabase.rpc('approve_deposit_request', { p_request_id: id });
            
            if (error) throw error;
            
            alert("✅ 입금 확인 및 포인트 지급이 완료되었습니다.");
            queryClient.invalidateQueries(['adminDepositRequests']);
        } catch (error) {
            console.error(error);
            alert(`❌ 처리 중 오류가 발생했습니다: ${error.message}`);
        }
    };

    // ==========================================================
    // 3. 관리자 반려 (입금 미확인 등)
    // ==========================================================
    const handleReject = async (id) => {
        const reason = window.prompt("반려 사유를 입력해주세요.\n(예: 입금자명 불일치, 입금 내역 없음 등)", "입금 내역을 확인할 수 없습니다.");
        
        if (reason === null) return; // 취소 버튼을 누른 경우
        
        try {
            const { error } = await supabase.rpc('reject_deposit_request', { 
                p_request_id: id, 
                p_reason: reason 
            });

            if (error) throw error;
            
            alert("✅ 반려 처리되었습니다.");
            queryClient.invalidateQueries(['adminDepositRequests']);
        } catch (error) {
            console.error(error);
            alert(`❌ 처리 중 오류가 발생했습니다: ${error.message}`);
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
                .ios-btn-micro.outline { background: transparent; border: 1px solid #E5E5EA; color: #1C1C1E; }
            `}} />

            <div>
                <h2 className="ios-title">포인트 충전(입금) 승인 관리</h2>
                <p className="ios-desc">고객이 신청한 무통장 입금 내역을 회사 계좌와 대조한 후 포인트를 지급합니다.</p>
            </div>

            <div className="ios-segment">
                <div className={`ios-segment-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                    <Clock size={14}/> 입금 확인 대기중
                </div>
                <div className={`ios-segment-btn ${activeTab === 'approved' ? 'active' : ''}`} onClick={() => setActiveTab('approved')}>
                    <CheckCircle2 size={14}/> 충전 완료 내역
                </div>
                <div className={`ios-segment-btn ${activeTab === 'rejected' ? 'active' : ''}`} onClick={() => setActiveTab('rejected')}>
                    <XCircle size={14}/> 반려 내역
                </div>
            </div>

            <div className="ios-table-wrap">
                <table className="ios-table">
                    <thead>
                        <tr>
                            <th className="ios-th">신청 일시</th>
                            <th className="ios-th">신청 회원 계정</th>
                            <th className="ios-th">입금자명</th>
                            <th className="ios-th" style={{ textAlign: 'right' }}>신청 금액 (원)</th>
                            <th className="ios-th" style={{ textAlign: 'center' }}>상태</th>
                            <th className="ios-th" style={{ textAlign: 'right', paddingRight: '16px' }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" className="ios-td" style={{ textAlign: 'center', padding: '60px', color: '#8E8E93' }}>데이터 동기화 중...</td></tr>
                        ) : deposits.length === 0 ? (
                            <tr><td colSpan="6" className="ios-td" style={{ textAlign: 'center', padding: '60px', color: '#8E8E93' }}>
                                {activeTab === 'pending' ? '대기 중인 충전 신청 내역이 없습니다.' : '조회된 내역이 없습니다.'}
                            </td></tr>
                        ) : (
                            deposits.map(req => (
                                <tr key={req.id} className="ios-tr">
                                    <td className="ios-td" style={{ fontSize: '11px', color: '#8E8E93' }}>
                                        {new Date(req.created_at).toLocaleString()}
                                    </td>
                                    <td className="ios-td">
                                        <div style={{ fontWeight: '600' }}>{req.profiles?.name || '이름미상'}</div>
                                        <div style={{ fontSize: '11px', color: '#8E8E93' }}>{req.profiles?.email}</div>
                                    </td>
                                    <td className="ios-td" style={{ fontWeight: '700', color: '#007AFF' }}>
                                        {req.depositor_name}
                                    </td>
                                    <td className="ios-td" style={{ textAlign: 'right', fontWeight: '800', color: '#D97706' }}>
                                        ₩ {req.request_amount.toLocaleString()}
                                    </td>
                                    <td className="ios-td" style={{ textAlign: 'center' }}>
                                        {req.status === 'pending' && <span style={{ color: '#FF9500', fontWeight: '700', fontSize: '12px' }}>확인중</span>}
                                        {req.status === 'approved' && <span style={{ color: '#34C759', fontWeight: '700', fontSize: '12px' }}>충전완료</span>}
                                        {req.status === 'rejected' && <span style={{ color: '#FF3B30', fontWeight: '700', fontSize: '12px' }}>반려됨</span>}
                                    </td>
                                    <td className="ios-td" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                        {activeTab === 'pending' ? (
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                <button className="ios-btn-micro success" onClick={() => handleApprove(req.id, req.depositor_name, req.request_amount)}>
                                                    입금 확인(승인)
                                                </button>
                                                <button className="ios-btn-micro danger" onClick={() => handleReject(req.id)}>
                                                    반려
                                                </button>
                                            </div>
                                        ) : req.status === 'rejected' ? (
                                            <div style={{ fontSize: '11px', color: '#8E8E93' }}>사유: {req.reject_reason}</div>
                                        ) : (
                                            <div style={{ fontSize: '11px', color: '#8E8E93' }}>
                                                처리일: {req.processed_at ? new Date(req.processed_at).toLocaleDateString() : '-'}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}