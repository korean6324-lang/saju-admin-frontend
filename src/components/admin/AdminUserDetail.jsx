// src/components/admin/AdminUserDetail.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { ArrowLeft, Save, ShieldAlert, Ticket, Key, Trash2, Ban, History, UserCheck, MonitorSmartphone, RefreshCw, ChevronLeft, ChevronRight, ShieldBan, ShieldCheck } from 'lucide-react';

export default function AdminUserDetail({ adminTheme, userId, onGoBack }) {
    const [user, setUser] = useState(null);
    const [accessLogs, setAccessLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [blockedIps, setBlockedIps] = useState(new Set());
    const itemsPerPage = 10;

    const [coinLogs, setCoinLogs] = useState([]);
    const [coinCurrentPage, setCoinCurrentPage] = useState(1);
    const [coinTotalPages, setCoinTotalPages] = useState(1);

    const [infoForm, setInfoForm] = useState({
        login_id: '', phone: '',
        role: 'user', membership_tier: 'free', is_blocked: false, memo: ''
    });

    const [newPassword, setNewPassword] = useState('');
    
    // ✨ 자산 종류(type)를 선택할 수 있도록 폼 상태 확장
    const [assetForm, setAssetForm] = useState({ type: 'ticket', amount: 0, reason: '' });

    const fetchAccessLogs = async (page = 1, isManual = false) => {
        try {
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data: logs, count, error } = await supabase
                .from('access_logs')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, to);
            
            if (error) {
                console.error("로그 조회 에러 상세:", error);
            } else {
                setAccessLogs(logs || []);
                setTotalPages(Math.ceil((count || 0) / itemsPerPage));
                setCurrentPage(page);

                if (logs && logs.length > 0) {
                    const uniqueIps = [...new Set(logs.map(log => log.ip_address))];
                    const { data: blockedData } = await supabase
                        .from('blocked_ips')
                        .select('ip_address')
                        .in('ip_address', uniqueIps);
                    
                    const blockedSet = new Set(blockedData?.map(b => b.ip_address) || []);
                    setBlockedIps(blockedSet);
                }
                
                if (isManual) {
                    if (logs && logs.length > 0) {
                        alert(`✅ 최신 접속 로그를 성공적으로 불러왔습니다. (현재 ${page}페이지)`);
                    } else {
                        alert(`ℹ️ DB를 확인했지만 아직 수집된 로그가 0건입니다.`);
                    }
                }
            }
        } catch (err) {
            console.error("네트워크 에러:", err);
        }
    };

    const fetchCoinLogs = async (page = 1, isManual = false) => {
        try {
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data: cLogs, count, error } = await supabase
                .from('coin_history')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, to);
            
            if (error) throw error;

            setCoinLogs(cLogs || []);
            setCoinTotalPages(Math.ceil((count || 0) / itemsPerPage));
            setCoinCurrentPage(page);

            if (isManual) alert(`✅ 자산 장부 내역을 불러왔습니다. (현재 ${page}페이지)`);
        } catch (err) { console.error("자산 로그 에러:", err); }
    };

    const toggleIpBlock = async (ipAddress) => {
        const isBlocked = blockedIps.has(ipAddress);
        
        try {
            if (isBlocked) {
                if (!window.confirm(`[${ipAddress}]\n해당 IP의 차단을 해제하시겠습니까?`)) return;
                const { error } = await supabase.from('blocked_ips').delete().eq('ip_address', ipAddress);
                if (error) throw error;
                alert('✅ IP 차단이 해제되었습니다.');
            } else {
                const reason = window.prompt(`[${ipAddress}]\n차단 사유를 입력하세요 (생략 가능):`);
                if (reason === null) return; 
                const { error } = await supabase.from('blocked_ips').insert([{ ip_address: ipAddress, reason: reason || '관리자 강제 차단' }]);
                if (error) throw error;
                alert('🚨 해당 IP가 즉시 차단되었습니다.');
            }
            fetchAccessLogs(currentPage);
        } catch (error) {
            alert("처리 중 에러가 발생했습니다: " + error.message);
        }
    };

    const loadUserData = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (profile) {
                setUser(profile);
                
                let mappedTier = profile.membership_tier || 'free';
                if (profile.role === 'partner') mappedTier = 'partner';
                if (profile.role === 'admin') mappedTier = 'admin';

                setInfoForm({
                    login_id: profile.login_id || '', phone: profile.phone || '', 
                    role: profile.role || 'user', membership_tier: mappedTier, 
                    is_blocked: profile.is_blocked || false, memo: profile.memo || ''
                });
            }
            await fetchAccessLogs(1, false);
            await fetchCoinLogs(1, false);
        } catch (error) { 
            console.error("로딩 에러:", error); 
        }
        setIsLoading(false);
    };

    useEffect(() => { loadUserData(); }, [userId]);

    const handleSaveInfo = async () => {
        if (!window.confirm("회원 등급 및 정보를 수정하시겠습니까?")) return;
        try {
            let newRole = 'user';
            if (infoForm.membership_tier === 'partner') newRole = 'partner';
            if (infoForm.membership_tier === 'admin') newRole = 'admin';

            const { error: rpcError } = await supabase.rpc('admin_update_user_full_info', {
                p_user_id: userId, 
                p_login_id: infoForm.login_id.trim() === '' ? null : infoForm.login_id, 
                p_phone: infoForm.phone, 
                p_role: newRole, 
                p_membership_tier: infoForm.membership_tier,
                p_is_blocked: infoForm.is_blocked, 
                p_memo: infoForm.memo
            });
            
            if (rpcError) throw rpcError;

            alert("✅ 등급 및 정보가 완벽하게 저장되었습니다.");
            loadUserData();
        } catch (error) { 
            console.error("저장 에러:", error);
            alert("❌ 수정 실패: " + error.message); 
        }
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
        const amt = parseInt(assetForm.amount) || 0;

        if (amt === 0) return alert("변경할 수량을 입력해주세요.");
        if (!assetForm.reason.trim()) return alert("지급/차감 사유를 입력해주세요 (장부 기록용).");

        const multiplier = type === 'add' ? 1 : -1;
        const actionText = type === 'add' ? '지급' : '차감';
        const finalAmount = amt * multiplier;

        // 선택된 자산 종류에 따른 한글 표시명
        const assetName = assetForm.type === 'ticket' ? '종합 열람권' : 
                          assetForm.type === 'lotto' ? '로또 이용권' : '타로 이용권';

        if (!window.confirm(`[${assetName}]\n수량: ${finalAmount}장\n해당 자산을 ${actionText}하시겠습니까?`)) return;

        try {
            // ✨ 새롭게 만든 특정 자산 지급/차감 함수 호출
            const { error } = await supabase.rpc('admin_adjust_specific_asset', {
                p_user_id: userId, 
                p_asset_type: assetForm.type,
                p_amount: finalAmount
            });
            if (error) throw error;

            const logsToInsert = [];
            if (amt !== 0) {
                logsToInsert.push({ 
                    user_id: userId, 
                    asset_type: assetForm.type, 
                    trade_type: type === 'add' ? 'admin_grant' : 'admin_revoke', 
                    amount: finalAmount, 
                    description: `[관리자 직권] ${assetForm.reason}` 
                });
            }

            if (logsToInsert.length > 0) {
                const { error: logError } = await supabase.from('coin_history').insert(logsToInsert);
                if (logError) console.error("장부 상세 기록 에러:", logError);
            }

            alert(`✅ ${assetName} ${actionText}이(가) 완료되었습니다.`);
            setAssetForm({ type: 'ticket', amount: 0, reason: '' });
            loadUserData(); 
        } catch (error) { 
            alert(`❌ 자산 ${actionText} 실패: ` + error.message); 
        }
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

    // 장부 리스트 표시용 이름 변환 함수
    const getAssetNameKor = (type) => {
        if (type === 'ticket') return '종합 열람권';
        if (type === 'lotto') return '로또 이용권';
        if (type === 'tarot') return '타로 이용권';
        return type;
    };

    if (isLoading) return <div style={{ padding: '40px', color: adminTheme.textMuted }}>데이터를 불러오는 중...</div>;
    if (!user) return <div style={{ padding: '40px', color: '#DC2626' }}>회원 정보를 찾을 수 없습니다.</div>;

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid ' + adminTheme.border, background: '#F9F9FB', color: '#1C1C1E', fontSize: '13px', outline: 'none' };
    const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: adminTheme.textMuted, marginBottom: '6px' };
    const cardStyle = { background: adminTheme.panelBg, borderRadius: '16px', border: '1px solid ' + adminTheme.border, padding: '24px', boxShadow: adminTheme.shadow };

    return (
        <div className="fade-in" style={{ padding: '0', maxWidth: '1200px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif' }}>
            <button onClick={onGoBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: adminTheme.textMuted, marginBottom: '24px', fontWeight: '600' }}>
                <ArrowLeft size={16}/> 목록으로 돌아가기
            </button>

            {/* ✨ 상단 유저 요약 정보 (자산 3종 모두 표시) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: adminTheme.textBright, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                        {user.name || user.login_id || user.email} 
                        <span style={{ fontSize: '15px', color: adminTheme.textMuted, fontWeight: '500', marginLeft: '8px' }}>
                            {user.login_id ? `(ID: ${user.login_id})` : "(이메일 가입)"}
                        </span>
                    </h2>
                    <div style={{ fontSize: '13px', color: adminTheme.textMuted }}>
                        가입일: {new Date(user.created_at).toLocaleString()} | 이메일: {user.email} | 고유코드: {user.id.substring(0,8)}...
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', textAlign: 'right', background: '#FFFFFF', padding: '12px 20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <div><div style={{ fontSize: '11px', color: adminTheme.textMuted }}>종합 열람권</div><div style={{ fontSize: '18px', fontWeight: '800', color: '#10B981' }}>{user.ticket_count || 0} 장</div></div>
                    <div style={{ width: '1px', background: '#E5E7EB' }}></div>
                    <div><div style={{ fontSize: '11px', color: adminTheme.textMuted }}>로또 이용권</div><div style={{ fontSize: '18px', fontWeight: '800', color: '#2563EB' }}>{user.daily_lotto_tickets || 0} 장</div></div>
                    <div style={{ width: '1px', background: '#E5E7EB' }}></div>
                    <div><div style={{ fontSize: '11px', color: adminTheme.textMuted }}>타로 이용권</div><div style={{ fontSize: '18px', fontWeight: '800', color: '#9333EA' }}>{user.daily_tarot_tickets || 0} 장</div></div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
                
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '15px', color: adminTheme.primary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontWeight: '700' }}>
                        <UserCheck size={18}/> 기본 정보 관리
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
                        
                        <div style={{ gridColumn: 'span 1' }}>
                            <label style={labelStyle}>회원 등급 변경 (4등급 체계)</label>
                            <select 
                                value={infoForm.membership_tier} 
                                onChange={e=>setInfoForm({...infoForm, membership_tier: e.target.value})} 
                                style={{ ...inputStyle, cursor: 'pointer', fontWeight: '700', color: infoForm.membership_tier === 'partner' ? '#16A34A' : '#007AFF' }}
                            >
                                <option value="free">무료 회원 (Free)</option>
                                <option value="basic">베이직 회원 (Basic)</option>
                                <option value="premium">프리미엄 회원 (Premium)</option>
                                <option value="partner">비즈니스 파트너 (Partner)</option>
                                <option value="admin">최고 관리자 (Admin)</option>
                            </select>
                            <span style={{ fontSize: '11px', color: '#8E8E93', display: 'block', marginTop: '4px', letterSpacing: '-0.3px' }}>
                                * 파트너 등급 부여 시, 해당 유저의 마이페이지에 명당/미디어 관리 메뉴가 자동 활성화됩니다.
                            </span>
                        </div>

                        <div>
                            <label style={labelStyle}>접속 차단 여부</label>
                            <select value={infoForm.is_blocked.toString()} onChange={e=>setInfoForm({...infoForm, is_blocked: e.target.value === 'true'})} style={{ ...inputStyle, color: infoForm.is_blocked ? '#DC2626' : '#16A34A', fontWeight: '700', cursor: 'pointer' }}>
                                <option value="false">정상 이용 (활성)</option>
                                <option value="true">계정 차단 (정지)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px', marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed ' + adminTheme.border }}>
                        <label style={labelStyle}>관리자 메모 (고객은 볼 수 없습니다)</label>
                        <textarea value={infoForm.memo} onChange={e=>setInfoForm({...infoForm, memo: e.target.value})} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="특이사항 메모..." />
                    </div>
                    
                    <button onClick={handleSaveInfo} style={{ width: '100%', background: '#1C1C1E', color: '#FFF', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>정보 저장하기</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '15px', color: '#007AFF', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontWeight: '700' }}>
                            <Ticket size={18}/> 쿠폰 및 열람권 지급/차감
                        </h3>
                        {/* ✨ 자산 종류 선택 셀렉트 박스 추가 */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>조정할 자산 종류 선택</label>
                            <select 
                                value={assetForm.type} 
                                onChange={e=>setAssetForm({...assetForm, type: e.target.value})} 
                                style={{ ...inputStyle, cursor: 'pointer', fontWeight: '600' }}
                            >
                                <option value="ticket">종합 열람권 (사주/궁합 등)</option>
                                <option value="lotto">로또 무료 이용권</option>
                                <option value="tarot">타로 무료 이용권</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>변경 수량 (장)</label>
                            <input type="number" value={assetForm.amount} onChange={e=>setAssetForm({...assetForm, amount: e.target.value})} style={inputStyle} placeholder="수량 입력 (예: 5)" />
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

                <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', color: '#007AFF', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: '700' }}>
                            <History size={18}/> 해당 유저 자산 변동 장부
                        </h3>
                        <button onClick={() => fetchCoinLogs(1, true)} style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#007AFF', cursor: 'pointer', fontWeight: '600' }}><RefreshCw size={14} /> 새로고침</button>
                    </div>
                    <div style={{ borderRadius: '8px', border: '1px solid ' + adminTheme.border, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead style={{ background: '#F8FAFC' }}>
                                <tr>
                                    <th style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: adminTheme.textMuted, fontWeight: '600' }}>일시</th>
                                    <th style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: adminTheme.textMuted, fontWeight: '600' }}>자산 구분</th>
                                    <th style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: adminTheme.textMuted, fontWeight: '600' }}>사유 및 내역</th>
                                    <th style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: adminTheme.textMuted, fontWeight: '600', textAlign: 'right' }}>변동 수량</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coinLogs.length === 0 ? (
                                    <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: adminTheme.textMuted }}>장부 내역이 없습니다.</td></tr>
                                ) : coinLogs.map(log => {
                                    const amount = log.amount || log.change_amount || 0;
                                    const isPlus = amount > 0;
                                    const unit = '장';
                                    
                                    return (
                                        <tr key={log.id}>
                                            <td style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border }}>{new Date(log.created_at).toLocaleString()}</td>
                                            <td style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, fontWeight: '600', color: '#007AFF' }}>
                                                {/* ✨ 기록된 장부의 자산 이름도 한글로 깔끔하게 변환 */}
                                                {getAssetNameKor(log.asset_type)}
                                            </td>
                                            <td style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: '#1C1C1E', fontWeight: '500' }}>{log.description}</td>
                                            <td style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, fontWeight: '700', color: isPlus ? '#16A34A' : '#DC2626', textAlign: 'right' }}>
                                                {isPlus ? '+' : ''}{amount.toLocaleString()} {unit}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {coinTotalPages > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                            <button disabled={coinCurrentPage === 1} onClick={() => fetchCoinLogs(coinCurrentPage - 1)} style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: coinCurrentPage === 1 ? 'not-allowed' : 'pointer', color: coinCurrentPage === 1 ? '#CBD5E1' : '#1C1C1E', fontWeight: '700' }}><ChevronLeft size={18}/> 이전</button>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: adminTheme.textMuted }}>{coinCurrentPage} / {coinTotalPages}</span>
                            <button disabled={coinCurrentPage >= coinTotalPages} onClick={() => fetchCoinLogs(coinCurrentPage + 1)} style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: coinCurrentPage >= coinTotalPages ? 'not-allowed' : 'pointer', color: coinCurrentPage >= coinTotalPages ? '#CBD5E1' : '#1C1C1E', fontWeight: '700' }}>다음 <ChevronRight size={18}/></button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: '1 / -1' }}>
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '15px', color: adminTheme.textBright, display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: '700' }}>
                                <MonitorSmartphone size={18}/> 최근 접속 IP 내역 (보안 로그)
                            </h3>
                            <button 
                                onClick={() => fetchAccessLogs(1, true)} 
                                style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#007AFF', cursor: 'pointer', fontWeight: '600' }}
                            >
                                <RefreshCw size={14} /> 새로고침
                            </button>
                        </div>
                        
                        <div style={{ borderRadius: '8px', border: '1px solid ' + adminTheme.border, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead style={{ background: '#F8FAFC' }}>
                                    <tr>
                                        <th style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: adminTheme.textMuted, fontWeight: '600' }}>접속 일시</th>
                                        <th style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: adminTheme.textMuted, fontWeight: '600' }}>접속 IP</th>
                                        <th style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: adminTheme.textMuted, fontWeight: '600' }}>차단 관리</th>
                                        <th style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: adminTheme.textMuted, fontWeight: '600' }}>환경 (브라우저/OS)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accessLogs.length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: adminTheme.textMuted }}>수집된 접속 로그가 없습니다.</td></tr>
                                    ) : accessLogs.map(log => {
                                        const isBlocked = blockedIps.has(log.ip_address);
                                        return (
                                            <tr key={log.id} style={{ background: isBlocked ? '#FEF2F2' : 'transparent' }}>
                                                <td style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border }}>{new Date(log.created_at).toLocaleString()}</td>
                                                <td style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, fontWeight: '700', color: isBlocked ? '#DC2626' : '#007AFF' }}>
                                                    {log.ip_address}
                                                </td>
                                                <td style={{ padding: '8px 16px', borderBottom: '1px solid ' + adminTheme.border }}>
                                                    <button 
                                                        onClick={() => toggleIpBlock(log.ip_address)} 
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '4px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', 
                                                            background: isBlocked ? '#DC2626' : '#E2E8F0', color: isBlocked ? '#FFF' : '#475569' 
                                                        }}
                                                    >
                                                        {isBlocked ? <span><ShieldCheck size={12} style={{ verticalAlign: 'middle' }}/> 차단 해제</span> : <span><ShieldBan size={12} style={{ verticalAlign: 'middle' }}/> IP 차단</span>}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '10px 16px', borderBottom: '1px solid ' + adminTheme.border, color: adminTheme.textMuted, fontSize: '11px' }}>{log.user_agent}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                                <button 
                                    disabled={currentPage === 1} 
                                    onClick={() => fetchAccessLogs(currentPage - 1)} 
                                    style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#CBD5E1' : '#1C1C1E', fontWeight: '700' }}
                                >
                                    <ChevronLeft size={18}/> 이전
                                </button>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: adminTheme.textMuted }}>
                                    {currentPage} / {totalPages}
                                </span>
                                <button 
                                    disabled={currentPage >= totalPages} 
                                    onClick={() => fetchAccessLogs(currentPage + 1)} 
                                    style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', color: currentPage >= totalPages ? '#CBD5E1' : '#1C1C1E', fontWeight: '700' }}
                                >
                                    다음 <ChevronRight size={18}/>
                                </button>
                            </div>
                        )}
                    </div>

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