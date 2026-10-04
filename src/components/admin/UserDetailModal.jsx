// src/components/admin/UserDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Settings, FileText, X, History } from 'lucide-react';

export default function UserDetailModal({ user, onClose, onRefresh, setSelectedUser }) {
    const [modalTab, setModalTab] = useState('info'); 
    const [memoText, setMemoText] = useState(user.admin_memo || '');
    const [isSavingMemo, setIsSavingMemo] = useState(false);
    const [isUpdatingTier, setIsUpdatingTier] = useState(false);

    // ==========================================================
    // 1. 자산 변동 내역 (로그) 불러오기
    // ==========================================================
    const { data: logs, isLoading: isLogsLoading } = useQuery({
        queryKey: ['assetLogs', user.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('asset_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: modalTab === 'history' // history 탭일 때만 데이터 페칭 (최적화)
    });

    // ==========================================================
    // 2. 통합 자산 제어 핸들러 (업데이트 + 로그 기록 동시 실행)
    // ==========================================================
    const handleUpdateAsset = async (dbColName, logAssetType, changeAmount, assetLabel) => {
        const currentBalance = user[dbColName] || 0;
        if (changeAmount < 0 && currentBalance < Math.abs(changeAmount)) {
            return alert(`보유한 ${assetLabel}보다 더 많이 차감할 수 없습니다.`);
        }
        
        const actionText = changeAmount > 0 ? `${Math.abs(changeAmount).toLocaleString()} 지급` : `${Math.abs(changeAmount).toLocaleString()} 차감`;
        if (!window.confirm(`${assetLabel}을(를) ${actionText} 하시겠습니까?`)) return;

        try {
            const newBalance = currentBalance + changeAmount;
            
            // 1) 프로필 잔액 업데이트
            const { error: updateError } = await supabase.from('profiles').update({ [dbColName]: newBalance }).eq('id', user.id);
            if (updateError) throw updateError;

            // 2) 자산 변동 로그 기록 (이전에 만든 DB 함수 호출)
            await supabase.rpc('log_asset_transaction', {
                p_user_id: user.id,
                p_asset_type: logAssetType,
                p_trade_type: changeAmount > 0 ? 'admin_grant' : 'admin_revoke',
                p_change_amount: changeAmount,
                p_result_balance: newBalance,
                p_description: `관리자 직권 ${changeAmount > 0 ? '지급' : '차감'}`
            });

            alert(`✅ 완료 (현재: ${newBalance.toLocaleString()})`);
            
            // UI 실시간 반영 및 리스트 새로고침
            setSelectedUser(prev => ({ ...prev, [dbColName]: newBalance }));
            onRefresh();
        } catch (error) { 
            console.error(error);
            alert(`${assetLabel} 수정 중 오류가 발생했습니다.`); 
        } 
    };

    // ==========================================================
    // 3. 기타 핸들러 (메모, 등급, 차단)
    // ==========================================================
    const handleSaveMemo = async () => {
        setIsSavingMemo(true);
        try {
            await supabase.from('profiles').update({ admin_memo: memoText }).eq('id', user.id);
            alert("✅ 메모 저장 완료");
            setSelectedUser(prev => ({...prev, admin_memo: memoText}));
            onRefresh();
        } catch (error) { alert("저장 실패"); } finally { setIsSavingMemo(false); }
    };

    const handleToggleBlock = async () => {
        if (!window.confirm(`회원을 ${user.is_blocked ? "차단 해제" : "차단"}하시겠습니까?`)) return;
        try {
            await supabase.from('profiles').update({ is_blocked: !user.is_blocked }).eq('id', user.id);
            setSelectedUser(prev => ({ ...prev, is_blocked: !user.is_blocked }));
            onRefresh();
            alert(`✅ 처리 완료`);
        } catch (error) { alert("처리 실패"); }
    };

    const handleChangeUserTier = async (newTier) => {
        if (!window.confirm('선택하신 등급으로 변경하시겠습니까?')) return;
        setIsUpdatingTier(true);
        try {
            let updatedRole = newTier === 'partner' ? 'partner' : 'user';
            let updatedTier = newTier === 'partner' ? (user.membership_tier || 'free') : newTier;

            const { error: profileError } = await supabase.rpc('admin_update_user_tier', {
                p_target_user_id: user.id, p_new_role: updatedRole, p_new_tier: updatedTier
            });
            if (profileError) throw profileError;

            // 파트너 상점 처리 (에러 무시)
            try {
                if (updatedRole === 'partner') {
                    const { data: existingShop } = await supabase.from('partner_shops').select('partner_id').eq('partner_id', user.id).maybeSingle();
                    if (!existingShop) await supabase.from('partner_shops').insert([{ partner_id: user.id, shop_name: '신규 상점', is_active: true }]);
                    else await supabase.from('partner_shops').update({ is_active: true }).eq('partner_id', user.id);
                } else {
                    await supabase.from('partner_shops').update({ is_active: false }).eq('partner_id', user.id);
                }
            } catch (e) {}
            
            setSelectedUser(prev => ({ ...prev, role: updatedRole, membership_tier: updatedTier }));
            onRefresh();
            alert('✅ 회원 등급 변경 완료');
        } catch (error) { 
            alert(`❌ 등급 변경 실패: ${error.message || '오류 발생'}`); 
        } finally { setIsUpdatingTier(false); }
    };

    // UI Helper
    const getLogBadge = (tradeType) => {
        const types = {
            'charge': { t: '충전', c: '#16A34A', bg: '#DCFCE7' },
            'exchange': { t: '환전', c: '#DC2626', bg: '#FEE2E2' },
            'admin_grant': { t: '지급', c: '#2563EB', bg: '#DBEAFE' },
            'admin_revoke': { t: '차감', c: '#EA580C', bg: '#FFEDD5' },
            'use_saju': { t: '사주', c: '#7C3AED', bg: '#EDE9FE' },
            'use_tarot': { t: '타로', c: '#4F46E5', bg: '#E0E7FF' }
        };
        return types[tradeType] || { t: '기타', c: '#4B5563', bg: '#F3F4F6' };
    };

    return (
        <div className="ios-modal-overlay" onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '20px', animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="ios-modal-card" onClick={e => e.stopPropagation()} style={{
                background: '#F2F2F7', width: '100%', maxWidth: '500px', borderRadius: '20px', overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }}>
                <div style={{ padding: '16px 20px', background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #E5E5EA' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1C1C1E', margin: 0 }}>회원 상세 관리 <span style={{fontSize:'13px', color:'#8E8E93', fontWeight:'500'}}>({user.name || user.email})</span></h3>
                    <button onClick={onClose} style={{ background: '#F2F2F7', border: 'none', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E8E93', cursor: 'pointer' }}><X size={16}/></button>
                </div>
                
                <div style={{ display: 'flex', padding: '12px 20px 0 20px', background: '#FFFFFF' }}>
                    <div style={{ display: 'inline-flex', backgroundColor: '#E5E5EA', borderRadius: '8px', padding: '2px', width: '100%', marginBottom: '12px' }}>
                        <div className={`ios-segment-btn ${modalTab === 'info' ? 'active' : ''}`} onClick={() => setModalTab('info')} style={getTabStyle(modalTab === 'info')}><Settings size={14}/> 정보/제어</div>
                        <div className={`ios-segment-btn ${modalTab === 'history' ? 'active' : ''}`} onClick={() => setModalTab('history')} style={getTabStyle(modalTab === 'history')}><History size={14}/> 자산 내역</div>
                        <div className={`ios-segment-btn ${modalTab === 'memo' ? 'active' : ''}`} onClick={() => setModalTab('memo')} style={getTabStyle(modalTab === 'memo')}><FileText size={14}/> 메모</div>
                    </div>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {/* 탭 1: 정보 및 제어 */}
                    {modalTab === 'info' && (
                        <>
                            <div className="ios-inset-group" style={insetGroupStyle}>
                                <div className="ios-inset-row" style={insetRowStyle}>
                                    <span style={labelStyle}>이메일 계정</span><span style={valueStyle}>{user.email}</span>
                                </div>
                                <div className="ios-inset-row" style={insetRowStyle}>
                                    <span style={labelStyle}>등급 변경</span>
                                    <select style={{...valueStyle, border:'none', background:'transparent', outline:'none', cursor:'pointer'}} disabled={isUpdatingTier} value={user.role === 'partner' ? 'partner' : (user.membership_tier || 'free')} onChange={(e) => handleChangeUserTier(e.target.value)}>
                                        <option value="free">무료회원</option><option value="basic">베이직</option><option value="premium">VIP 프리미엄</option><option value="partner">파트너</option>
                                    </select>
                                </div>
                                <div className="ios-inset-row" style={{...insetRowStyle, borderBottom:'none'}}>
                                    <span style={labelStyle}>계정 차단</span>
                                    <button style={{...btnMicroStyle, color: user.is_blocked ? '#34C759' : '#FF3B30', background: user.is_blocked ? '#E5FBEB' : '#FFE5E5'}} onClick={handleToggleBlock}>
                                        {user.is_blocked ? '차단 해제하기' : '이 계정 차단'}
                                    </button>
                                </div>
                            </div>

                            {/* 포인트, 게임머니, 쿠폰 제어 통합 렌더링 */}
                            {[
                                { title: '보유 포인트', col: 'point_balance', logType: 'point', unit: 'P', color: '#D97706', steps: [10000, 50000] },
                                { title: '보유 게임머니', col: 'game_money_balance', logType: 'game_money', unit: 'G', color: '#7C3AED', steps: [10000, 50000] },
                                { title: '열람쿠폰 (공용)', col: 'ticket_count', logType: 'ticket', unit: '장', color: '#007AFF', steps: [1, 5] }
                            ].map((asset, idx) => (
                                <div key={idx} className="ios-inset-group" style={insetGroupStyle}>
                                    <div className="ios-inset-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', borderBottom: 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span style={labelStyle}>{asset.title}</span>
                                            <span style={{ fontSize: '15px', fontWeight: '800', color: asset.color }}>{(user[asset.col] || 0).toLocaleString()} {asset.unit}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                            <button style={{...btnMicroStyle, flex:1, border:'1px solid #E5E5EA', background:'transparent', color:'#1C1C1E'}} onClick={() => handleUpdateAsset(asset.col, asset.logType, asset.steps[0], asset.title)}>+{asset.steps[0].toLocaleString()}{asset.unit} 지급</button>
                                            <button style={{...btnMicroStyle, flex:1, border:'1px solid #E5E5EA', background:'transparent', color:'#1C1C1E'}} onClick={() => handleUpdateAsset(asset.col, asset.logType, asset.steps[1], asset.title)}>+{asset.steps[1].toLocaleString()}{asset.unit} 지급</button>
                                            <button style={{...btnMicroStyle, flex:1, color:'#FF3B30', background:'#FFE5E5'}} onClick={() => handleUpdateAsset(asset.col, asset.logType, -asset.steps[0], asset.title)} disabled={(user[asset.col]||0) < asset.steps[0]}>-{asset.steps[0].toLocaleString()}{asset.unit} 차감</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* 🚨 탭 2: 자산 변동 내역 (신규 개발 모듈) */}
                    {modalTab === 'history' && (
                        <div className="ios-inset-group" style={{...insetGroupStyle, padding: 0}}>
                            {isLogsLoading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#8E8E93', fontSize: '13px' }}>내역을 불러오는 중...</div>
                            ) : logs.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#8E8E93', fontSize: '13px' }}>자산 변동 내역이 없습니다.</div>
                            ) : (
                                logs.map(log => {
                                    const badge = getLogBadge(log.trade_type);
                                    const isPlus = log.change_amount > 0;
                                    const unit = log.asset_type === 'point' ? 'P' : (log.asset_type === 'game_money' ? 'G' : '장');
                                    return (
                                        <div key={log.id} style={{ padding: '14px 16px', borderBottom: '0.5px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#8E8E93', marginBottom: '6px' }}>{new Date(log.created_at).toLocaleString()}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 6px', borderRadius: '4px', backgroundColor: badge.bg, color: badge.c }}>{badge.t}</span>
                                                    <span style={{ fontSize: '13px', color: '#1C1C1E', fontWeight: '600' }}>{log.description || '-'}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '15px', fontWeight: '800', color: isPlus ? '#16A34A' : '#DC2626' }}>
                                                    {isPlus ? '+' : ''}{log.change_amount.toLocaleString()} {unit}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#8E8E93', marginTop: '4px', fontWeight: '500' }}>잔액: {log.result_balance.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* 탭 3: 메모 */}
                    {modalTab === 'memo' && (
                        <div className="ios-inset-group" style={{...insetGroupStyle, padding: '16px'}}>
                            <p style={{ fontSize: '12px', color: '#FF3B30', margin: '0 0 12px 0', fontWeight: '600' }}>※ 고객에게는 절대 노출되지 않는 내부 관리용 메모입니다.</p>
                            <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="블랙리스트 사유, CS 내역 등을 입력하세요." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: '#1C1C1E', lineHeight: '1.5', resize: 'vertical', minHeight: '120px', fontFamily: 'inherit' }} />
                            <button onClick={handleSaveMemo} disabled={isSavingMemo} style={{ width: '100%', marginTop: '16px', padding: '12px', fontSize: '14px', background: '#007AFF', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                                {isSavingMemo ? '저장 중...' : '메모 저장'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 모달 내부 인라인 스타일 정의
const insetGroupStyle = { background: '#FFFFFF', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' };
const insetRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid #E5E5EA', minHeight: '44px' };
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#1C1C1E' };
const valueStyle = { fontSize: '13px', fontWeight: '500', color: '#8E8E93', textAlign: 'right' };
const btnMicroStyle = { border: 'none', fontSize: '11px', fontWeight: '700', padding: '6px 0', borderRadius: '6px', cursor: 'pointer', transition: '0.2s', textAlign: 'center' };
const getTabStyle = (isActive) => ({
    padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: isActive ? '#1C1C1E' : '#8E8E93', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center',
    backgroundColor: isActive ? '#FFFFFF' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
});