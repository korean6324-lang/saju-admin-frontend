// src/components/admin/AdminUserDetail.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { ArrowLeft, Save, ShieldAlert, Coins, Ticket, Key, Trash2, Ban, History, UserCheck, MonitorSmartphone, RefreshCw } from 'lucide-react';

export default function AdminUserDetail({ adminTheme, userId, onGoBack }) {
    const [user, setUser] = useState(null);
    const [accessLogs, setAccessLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 1. 기본 정보 & 권한 폼
    const [infoForm, setInfoForm] = useState({
        login_id: '', exchange_password: '', phone: '',
        role: 'user', membership_tier: 'free', is_blocked: false, memo: ''
    });

    const [newPassword, setNewPassword] = useState('');
    const [assetForm, setAssetForm] = useState({ point: 0, game_money: 0, ticket: 0, reason: '' });

    // 🚨 접속 로그만 단독으로 다시 불러오는 함수 (팝업 피드백 추가)
    const fetchAccessLogs = async (isManual = false) => {
        try {
            const { data: logs, error } = await supabase
                .from('access_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) {
                console.error("로그 조회 에러 상세:", error);
                alert(`접속 로그를 불러오지 못했습니다.\n원인: ${error.message}`);
            } else {
                setAccessLogs(logs || []);
                
                // 사용자가 직접 '새로고침' 버튼을 눌렀을 때만 팝업 알림
                if (isManual) {
                    if (logs && logs.length > 0) {
                        alert(`✅ 최신 접속 로그 ${logs.length}건을 성공적으로 불러왔습니다.`);
                    } else {
                        alert(`ℹ️ DB를 확인했지만 아직 수집된 로그가 0건입니다.\n\n[해결 방법]\n1. 유저 화면(두 번째 탭, 화복당)으로 이동합니다.\n2. 키보드 F5(새로고침)를 한 번 누릅니다.\n3. 다시 여기로 와서 이 버튼을 눌러보세요!`);
                    }
                }
            }
        } catch (err) {
            console.error("네트워크 에러:", err);
        }
    };

    // 전체 데이터 로드
    const loadUserData = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            // 회원 기본 정보
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (profile) {
                setUser(profile);
                setInfoForm({
                    login_id: profile.login_id || '', exchange_password: profile.exchange_password || '',
                    phone: profile.phone || '', role: profile.role || 'user', 
                    membership_tier: profile.membership_tier || 'free', is_blocked: profile.is_blocked || false,
                    memo: profile.memo || ''
                });
            }
            
            // 접속 IP 이력 호출 (초기 로드는 팝업 띄우지 않음)
            await fetchAccessLogs(false);

        } catch (error) { 
            console.error("로딩 에러:", error); 
        }
        setIsLoading(false);
    };

    useEffect(() => { loadUserData(); }, [userId]);

    // ==========================================
    // 핸들러 함수들
    // ==========================================
    const handleSaveInfo = async () => {
        if (!window.confirm("회원 기본 정보 및 권한을 수정하시겠습니까?")) return;
        try {
            const { error } = await supabase.rpc('admin_update_user_full', {
                p_user_id: userId, p_login_id: infoForm.login_id, p_exchange_password: infoForm.exchange_password,
                p_phone: infoForm.phone, p_role: infoForm.role, p_membership_tier: infoForm.membership_tier,
                p_is_blocked: infoForm.is_blocked, p_memo: infoForm.memo
            });
            if (error) throw error;
            alert("✅ 정보가 성공적으로 수정되었습니다.");
            loadUserData();
        } catch (error) { alert("❌ 수정 실패: " + error.message); }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 6) return alert("비밀번호는 6자리 이상이어야 합니다.");
        if (!window.confirm("해당 회원의 로그인 비밀번호를 강제로 변경하시겠습니까?")) return;
        try {
            const { error } = await supabase.rpc('admin_change_user_password', { p_user_id: userId, p_new_password: newPassword });
            if (error) throw error;
            alert("✅ 비밀번호가 변경되었습니다.");
            setNewPassword('');
        } catch (error) { alert("❌ 비밀번호 변경 실패: " + error.message); }
    };

    const handleAdjustAssets = async (type) => { 
        const pt = parseInt(assetForm.point) || 0;
        const gm = parseInt(assetForm.game_money) || 0;
        const tk = parseInt(assetForm.ticket) || 0;

        if (pt === 0 && gm === 0 && tk === 0) return alert("변경할 자산 금액/수량을 입력해주세요.");
        if (!assetForm.reason.trim()) return alert("지급/차감 사유를 입력해주세요 (장부 기록용).");

        const multiplier = type === 'add' ? 1 : -1;
        const actionText = type === 'add' ? '지급' : '차감';

        if (!window.confirm(`포인트: ${pt * multiplier}, 게임머니: ${gm * multiplier}, 열람권: ${tk * multiplier}\n해당 자산을 ${actionText}하시겠습니까?`)) return;

        try {
            const { error } = await supabase.rpc('admin_adjust_user_assets', {
                p_user_id: userId, p_point_change: pt * multiplier, p_game_money_change: gm * multiplier, p_ticket_change: tk * multiplier
            });
            if (error) throw error;

            await supabase.from('coin_history').insert([{
                user_id: userId, asset_type: 'point', trade_type: type === 'add' ? 'admin_grant' : 'admin_revoke', amount: pt * multiplier, description: `[관리자 직권] ${assetForm.reason}`
            }]);

            alert(`✅ 성공적으로 ${actionText}되었습니다.`);
            setAssetForm({ point: 0, game_money: 0, ticket: 0, reason: '' });
            loadUserData();
        } catch (error) { alert(`❌ 자산 ${actionText} 실패: ` + error.message); }
    };

    const handleDeleteUser = async () => {
        if (!window.confirm("🚨 경고: 계정을 영구 삭제하시겠습니까?\n모든 자산과 데이터가 즉시 삭제되며 복구할 수 없습니다.")) return;
        const confirmText = window.prompt("삭제를 진행하려면 '영구삭제' 라고 입력해주세요.");
        if (confirmText !== '영구삭제') return alert("입력값이 일치하지 않아 취소되었습니다.");

        try {
            const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
            if (error) throw error;
            alert("🗑️ 계정이 영구 삭제되었습니다.");
            onGoBack(); 
        } catch (error) { alert("❌ 삭제 실패: " + error.message); }
    };

    if (isLoading) return <div style={{ padding: '40px', color: adminTheme.textMuted }}>데이터를 불러오는 중...</div>;
    if (!user) return <div style={{ padding: '40px', color: '#DC2626' }}>회원 정보를 찾을 수 없습니다.</div>;

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${adminTheme.border}`, background: '#F9F9FB', color: '#1C1C1E', fontSize: '13px', outline: 'none' };
    const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: adminTheme.textMuted, marginBottom: '6px' };
    const cardStyle = { background: adminTheme.panelBg, borderRadius: '16px', border: `1px solid ${adminTheme.border}`, padding: '24px', boxShadow: adminTheme.shadow };

    return (
        <div className="fade-in" style={{ padding: '0', maxWidth: '1200px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif' }}>
            <button onClick={onGoBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: adminTheme.textMuted, marginBottom: '24px', fontWeight: '600' }}>
                <ArrowLeft size={16}/> 목록으로 돌아가기
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: adminTheme.textBright, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                        {user.name || user.login_id || user.email} 
                        <span style={{ fontSize: '15px', color: adminTheme.textMuted, fontWeight: '500', marginLeft: '8px' }}>
                            ({user.login_id ? `ID: ${user.login_id}` : `이메일 가입`})
                        </span>
                    </h2>
                    <div style={{ fontSize: '13px', color: adminTheme.textMuted }}>
                        가입일: {new Date(user.created_at).toLocaleString()} | 이메일: {user.email} | 고유코드: {user.id.substring(0,8)}...
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
                    <div><div style={{ fontSize: '11px', color: adminTheme.textMuted }}>보유 포인트</div><div style={{ fontSize: '18px', fontWeight: '800', color: '#D97706' }}>{(user.point_balance || 0).toLocaleString()} P</div></div>
                    <div><div style={{ fontSize: '11px', color: adminTheme.textMuted }}>보유 게임머니</div><div style={{ fontSize: '18px', fontWeight: '800', color: '#7C3AED' }}>{(user.game_money_balance || 0).toLocaleString()} G</div></div>
                    <div><div style={{ fontSize: '11px', color: adminTheme.textMuted }}>보유 열람권</div><div style={{ fontSize: '18px', fontWeight: '800', color: '#007AFF' }}>{user.ticket_count || 0} 장</div></div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
                
                {/* 1. 기본 정보 및 계정 권한 */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '15px', color: adminTheme.primary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontWeight: '700' }}>
                        <UserCheck size={18}/> 기본 정보 및 권한 제어
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        
                        <div>
                            <label style={labelStyle}>로그인 비밀번호 (강제 변경)</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input type="text" value={newPassword} onChange={e=>setNewPassword(e.target.value)} style={{ ...inputStyle, flex: 1, padding: '10px' }} placeholder="새 비밀번호 입력" />
                                <button onClick={handleChangePassword} style={{ background: '#7C3AED', color: '#FFF', border: 'none', padding: '0 14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>변경</button>
                            </div>
                        </div>

                        <div><label style={labelStyle}>휴대폰 번호 (수정)</label><input type="text" value={infoForm.phone} onChange={e=>setInfoForm({...infoForm, phone: e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>환전 비밀번호 (수정)</label><input type="text" value={infoForm.exchange_password} onChange={e=>setInfoForm({...infoForm, exchange_password: e.target.value})} style={inputStyle} /></div>
                        <div>
                            <label style={labelStyle}>회원 등급 변경</label>
                            <select value={infoForm.role} onChange={e=>setInfoForm({...infoForm, role: e.target.value})} style={{ ...inputStyle, cursor: 'pointer' }}>
                                <option value="user">일반 회원 (User)</option>
                                <option value="partner">파트너 (Partner)</option>
                                <option value="admin">관리자 (Admin)</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>유료 구독 상태</label>
                            <select value={infoForm.membership_tier} onChange={e=>setInfoForm({...infoForm, membership_tier: e.target.value})} style={{ ...inputStyle, cursor: 'pointer' }}>
                                <option value="free">무료 (Free)</option>
                                <option value="basic">베이직 (Basic)</option>
                                <option value="premium">프리미엄 VIP (Premium)</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>접속 차단 여부</label>
                            <select value={infoForm.is_blocked} onChange={e=>setInfoForm({...infoForm, is_blocked: e.target.value === 'true'})} style={{ ...inputStyle, color: infoForm.is_blocked ? '#DC2626' : '#16A34A', fontWeight: '700', cursor: 'pointer' }}>
                                <option value="false">정상 이용 (활성)</option>
                                <option value="true">계정 차단 (정지)</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>관리자 메모 (고객은 볼 수 없습니다)</label>
                        <textarea value={infoForm.memo} onChange={e=>setInfoForm({...infoForm, memo: e.target.value})} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="특이사항 메모..." />
                    </div>
                    <button onClick={handleSaveInfo} style={{ width: '100%', background: '#1C1C1E', color: '#FFF', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>정보 및 권한 저장</button>
                </div>

                {/* 2. 자산 지급/차감 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '15px', color: '#D97706', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontWeight: '700' }}>
                            <Coins size={18}/> 자산 지급 및 차감
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div><label style={labelStyle}>포인트 (P)</label><input type="number" value={assetForm.point} onChange={e=>setAssetForm({...assetForm, point: e.target.value})} style={inputStyle} /></div>
                            <div><label style={labelStyle}>게임머니 (G)</label><input type="number" value={assetForm.game_money} onChange={e=>setAssetForm({...assetForm, game_money: e.target.value})} style={inputStyle} /></div>
                            <div><label style={labelStyle}>열람권 (장)</label><input type="number" value={assetForm.ticket} onChange={e=>setAssetForm({...assetForm, ticket: e.target.value})} style={inputStyle} /></div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>지급/차감 사유 (필수)</label>
                            <input type="text" value={assetForm.reason} onChange={e=>setAssetForm({...assetForm, reason: e.target.value})} style={inputStyle} placeholder="예: 이벤트 당첨 보상, 서비스 오류 보상 등" />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => handleAdjustAssets('add')} style={{ flex: 1, background: '#16A34A', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>+ 지급하기</button>
                            <button onClick={() => handleAdjustAssets('deduct')} style={{ flex: 1, background: '#DC2626', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>- 차감하기</button>
                        </div>
                    </div>
                </div>

                {/* 3. 보안 로그 & 위험 관리 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: '1 / -1' }}>
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '15px', color: adminTheme.textBright, display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: '700' }}>
                                <MonitorSmartphone size={18}/> 최근 접속 IP 내역 (보안 로그)
                            </h3>
                            {/* 🚨 isManual = true 로 호출하도록 수정 */}
                            <button 
                                onClick={() => fetchAccessLogs(true)} 
                                style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#007AFF', cursor: 'pointer', fontWeight: '600' }}
                            >
                                <RefreshCw size={14} /> 새로고침
                            </button>
                        </div>
                        <div style={{ borderRadius: '8px', border: `1px solid ${adminTheme.border}`, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead style={{ background: '#F8FAFC' }}>
                                    <tr>
                                        <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>접속 일시</th>
                                        <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>접속 IP</th>
                                        <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>환경 (브라우저/OS)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accessLogs.length === 0 ? (
                                        <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: adminTheme.textMuted }}>수집된 접속 로그가 없습니다.</td></tr>
                                    ) : accessLogs.map(log => (
                                        <tr key={log.id}>
                                            <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}` }}>{new Date(log.created_at).toLocaleString()}</td>
                                            <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, fontWeight: '600', color: '#007AFF' }}>{log.ip_address}</td>
                                            <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontSize: '11px' }}>{log.user_agent}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 위험 구역 (계정 삭제) */}
                    <div style={{ ...cardStyle, border: '1px solid #FECACA', background: '#FEF2F2' }}>
                        <h3 style={{ fontSize: '15px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '700' }}>
                            <Trash2 size={18}/> 위험 구역 (Danger Zone)
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: '13px', color: '#991B1B', margin: 0 }}>계정을 영구적으로 삭제합니다. 복구가 절대 불가능하므로 신중하게 조작하세요.</p>
                            <button onClick={handleDeleteUser} style={{ background: '#DC2626', color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>회원 영구 삭제</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}