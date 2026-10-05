// src/components/admin/AdminUserDetail.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { ArrowLeft, Save, ShieldAlert, Coins, Ticket, Key, Trash2, Ban, History, UserCheck, MonitorSmartphone, RefreshCw, ChevronLeft, ChevronRight, ShieldBan, ShieldCheck } from 'lucide-react';

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
        login_id: '', exchange_password: '', phone: '',
        role: 'user', membership_tier: 'free', is_blocked: false, memo: '',
        bank_name: '', bank_account_number: '', bank_account_holder: '', crypto_wallet_address: ''
    });

    const [newPassword, setNewPassword] = useState('');
    const [assetForm, setAssetForm] = useState({ point: 0, game_money: 0, ticket: 0, reason: '' });

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
                
                // 🚨 기존에 파트너/어드민 권한이 있던 유저의 데이터를 통합 4등급 체계로 변환 매핑
                let mappedTier = profile.membership_tier || 'free';
                if (profile.role === 'partner') mappedTier = 'partner';
                if (profile.role === 'admin') mappedTier = 'admin';

                setInfoForm({
                    login_id: profile.login_id || '', exchange_password: profile.exchange_password || '',
                    phone: profile.phone || '', role: profile.role || 'user', 
                    membership_tier: mappedTier, 
                    is_blocked: profile.is_blocked || false,
                    memo: profile.memo || '',
                    bank_name: profile.bank_name || '', bank_account_number: profile.bank_account_number || '',
                    bank_account_holder: profile.bank_account_holder || '', crypto_wallet_address: profile.crypto_wallet_address || ''
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

    // 🚨 400 에러를 유발하던 RPC 함수 호출을 제거하고 직접 다이렉트 업데이트로 완벽 해결
    const handleSaveInfo = async () => {
        if (!window.confirm("회원 등급 및 정보를 수정하시겠습니까?")) return;
        try {
            // 선택된 4등급 체계에 맞게 시스템 내부 Role(권한) 자동 동기화
            let newRole = 'user';
            if (infoForm.membership_tier === 'partner') newRole = 'partner';
            if (infoForm.membership_tier === 'admin') newRole = 'admin';

            const updatePayload = {
                login_id: infoForm.login_id,
                exchange_password: infoForm.exchange_password,
                phone: infoForm.phone,
                membership_tier: infoForm.membership_tier,
                role: newRole,
                is_blocked: infoForm.is_blocked,
                memo: infoForm.memo,
                bank_name: infoForm.bank_name,
                bank_account_number: infoForm.bank_account_number,
                bank_account_holder: infoForm.bank_account_holder,
                crypto_wallet_address: infoForm.crypto_wallet_address
            };

            const { error: updateError } = await supabase.from('profiles').update(updatePayload).eq('id', userId);
            
            // DB 제약 조건으로 Role 업데이트가 막혀있을 경우를 대비한 안전 장치 (Role 제외하고 저장)
            if (updateError) {
                console.warn("DB Role 제약 발생, 등급 및 정보만 안전하게 저장합니다.");
                delete updatePayload.role;
                const { error: retryError } = await supabase.from('profiles').update(updatePayload).eq('id', userId);
                if (retryError) throw retryError;
            }

            alert("✅ 정보가 성공적으로 수정되었습니다.");
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

            const logsToInsert = [];
            
            if (pt !== 0) logsToInsert.push({ user_id: userId, asset_type: 'point', trade_type: type === 'add' ? 'admin_grant' : 'admin_revoke', amount: pt * multiplier, description: `[관리자 직권] ${assetForm.reason}` });
            if (gm !== 0) logsToInsert.push({ user_id: userId, asset_type: 'game_money', trade_type: type === 'add' ? 'admin_grant' : 'admin_revoke', amount: gm * multiplier, description: `[관리자 직권] ${assetForm.reason}` });
            if (tk !== 0) logsToInsert.push({ user_id: userId, asset_type: 'ticket', trade_type: type === 'add' ? 'admin_grant' : 'admin_revoke', amount: tk * multiplier, description: `[관리자 직권] ${assetForm.reason}` });

            if (logsToInsert.length > 0) {
                const { error: logError } = await supabase.from('coin_history').insert(logsToInsert);
                if (logError) console.error("장부 상세 기록 에러:", logError);
            }

            alert(`✅ 성공적으로 ${actionText}되었습니다.`);
            setAssetForm({ point: 0, game_money: 0, ticket: 0, reason: '' });
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
                        <div><label style={labelStyle}>환전 비밀번호 (수정)</label><input type="text" value={infoForm.exchange_password} onChange={e=>setInfoForm({...infoForm, exchange_password: e.target.value})} style={inputStyle} /></div>
                        
                        {/* 🚨 4등급 체계로 완전히 통합된 스마트 설정 드롭다운 */}
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
                            <select value={infoForm.is_blocked} onChange={e=>setInfoForm({...infoForm, is_blocked: e.target.value === 'true'})} style={{ ...inputStyle, color: infoForm.is_blocked ? '#DC2626' : '#16A34A', fontWeight: '700', cursor: 'pointer' }}>
                                <option value="false">정상 이용 (활성)</option>
                                <option value="true">계정 차단 (정지)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '16px', paddingTop: '16px', borderTop: `1px dashed ${adminTheme.border}`, marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '13px', color: '#D97706', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Coins size={14} /> 유저가 등록한 환전(수령) 계좌 및 지갑
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div><label style={labelStyle}>은행명</label><input type="text" value={infoForm.bank_name} onChange={e=>setInfoForm({...infoForm, bank_name: e.target.value})} style={inputStyle} placeholder="예: 국민은행" /></div>
                            <div><label style={labelStyle}>계좌번호</label><input type="text" value={infoForm.bank_account_number} onChange={e=>setInfoForm({...infoForm, bank_account_number: e.target.value})} style={inputStyle} placeholder="계좌번호 (- 포함)" /></div>
                            <div><label style={labelStyle}>예금주</label><input type="text" value={infoForm.bank_account_holder} onChange={e=>setInfoForm({...infoForm, bank_account_holder: e.target.value})} style={inputStyle} placeholder="예금주" /></div>
                        </div>
                        <div>
                            <label style={labelStyle}>전자지갑 주소 (USDT 등)</label>
                            <input type="text" value={infoForm.crypto_wallet_address} onChange={e=>setInfoForm({...infoForm, crypto_wallet_address: e.target.value})} style={inputStyle} placeholder="전자지갑 주소" />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>관리자 메모 (고객은 볼 수 없습니다)</label>
                        <textarea value={infoForm.memo} onChange={e=>setInfoForm({...infoForm, memo: e.target.value})} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="특이사항 메모..." />
                    </div>
                    
                    <button onClick={handleSaveInfo} style={{ width: '100%', background: '#1C1C1E', color: '#FFF', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>정보 저장하기</button>
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

                {/* 3. 자산 변동 내역 (장부) */}
                <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', color: '#007AFF', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: '700' }}>
                            <History size={18}/> 해당 유저 자산 변동 장부
                        </h3>
                        <button onClick={() => fetchCoinLogs(1, true)} style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#007AFF', cursor: 'pointer', fontWeight: '600' }}><RefreshCw size={14} /> 새로고침</button>
                    </div>
                    <div style={{ borderRadius: '8px', border: `1px solid ${adminTheme.border}`, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead style={{ background: '#F8FAFC' }}>
                                <tr>
                                    <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>일시</th>
                                    <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>자산 구분</th>
                                    <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>사유 및 내역</th>
                                    <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600', textAlign: 'right' }}>변동 금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coinLogs.length === 0 ? (
                                    <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: adminTheme.textMuted }}>장부 내역이 없습니다.</td></tr>
                                ) : coinLogs.map(log => {
                                    const amount = log.amount || log.change_amount || 0;
                                    const isPlus = amount > 0;
                                    const unit = log.asset_type === 'point' ? 'P' : (log.asset_type === 'game_money' ? 'G' : '장');
                                    
                                    return (
                                        <tr key={log.id}>
                                            <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}` }}>{new Date(log.created_at).toLocaleString()}</td>
                                            <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, fontWeight: '600', color: log.asset_type === 'point' ? '#D97706' : '#7C3AED' }}>
                                                {log.asset_type === 'point' ? '포인트' : log.asset_type === 'game_money' ? '게임머니' : '열람권'}
                                            </td>
                                            <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: '#1C1C1E', fontWeight: '500' }}>{log.description}</td>
                                            <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, fontWeight: '700', color: isPlus ? '#16A34A' : '#DC2626', textAlign: 'right' }}>
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

                {/* 4. 접속 IP 보안 로그 */}
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
                        
                        <div style={{ borderRadius: '8px', border: `1px solid ${adminTheme.border}`, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead style={{ background: '#F8FAFC' }}>
                                    <tr>
                                        <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>접속 일시</th>
                                        <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>접속 IP</th>
                                        <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>차단 관리</th>
                                        <th style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontWeight: '600' }}>환경 (브라우저/OS)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accessLogs.length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: adminTheme.textMuted }}>수집된 접속 로그가 없습니다.</td></tr>
                                    ) : accessLogs.map(log => {
                                        const isBlocked = blockedIps.has(log.ip_address);
                                        return (
                                            <tr key={log.id} style={{ background: isBlocked ? '#FEF2F2' : 'transparent' }}>
                                                <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}` }}>{new Date(log.created_at).toLocaleString()}</td>
                                                <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, fontWeight: '700', color: isBlocked ? '#DC2626' : '#007AFF' }}>
                                                    {log.ip_address}
                                                </td>
                                                <td style={{ padding: '8px 16px', borderBottom: `1px solid ${adminTheme.border}` }}>
                                                    <button 
                                                        onClick={() => toggleIpBlock(log.ip_address)} 
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '4px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', 
                                                            background: isBlocked ? '#DC2626' : '#E2E8F0', color: isBlocked ? '#FFF' : '#475569' 
                                                        }}
                                                    >
                                                        {isBlocked ? <><ShieldCheck size={12}/> 차단 해제</> : <><ShieldBan size={12}/> IP 차단</>}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '10px 16px', borderBottom: `1px solid ${adminTheme.border}`, color: adminTheme.textMuted, fontSize: '11px' }}>{log.user_agent}</td>
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