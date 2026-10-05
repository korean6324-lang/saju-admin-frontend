// src/components/admin/AdminUserDetail.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { ArrowLeft, Save, ShieldAlert } from 'lucide-react';

// 🚨 라우터(useParams) 방식에서 대시보드 내부 Props 방식으로 변경
export default function AdminUserDetail({ adminTheme, userId, onGoBack }) {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({ login_id: '', exchange_password: '', phone: '' });

    useEffect(() => {
        const loadUser = async () => {
            if (!userId) return; // 아이디가 없을 땐 요청 방지 (400 에러 차단)
            
            try {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
                if (error) throw error;
                
                if (data) {
                    setUser(data);
                    setFormData({ 
                        login_id: data.login_id || '', 
                        exchange_password: data.exchange_password || '', 
                        phone: data.phone || '' 
                    });
                }
            } catch (error) {
                console.error("유저 정보 로딩 오류:", error);
            }
        };
        loadUser();
    }, [userId]);

    const handleSave = async () => {
        if (!window.confirm("회원 접속 정보를 강제로 수정하시겠습니까?")) return;
        try {
            const { error } = await supabase.rpc('admin_update_user_info', {
                p_user_id: userId,
                p_login_id: formData.login_id,
                p_exchange_password: formData.exchange_password,
                p_phone: formData.phone
            });
            if (error) throw error;
            alert("✅ 성공적으로 수정되었습니다.");
        } catch (error) {
            alert("❌ 수정 실패: " + error.message);
        }
    };

    if (!user) return <div style={{ padding: '40px', color: adminTheme.textMuted }}>데이터를 불러오는 중...</div>;

    return (
        <div className="fade-in" style={{ padding: '0', maxWidth: '800px' }}>
            <button onClick={onGoBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: adminTheme.textMuted, marginBottom: '24px' }}>
                <ArrowLeft size={16}/> 목록으로 돌아가기
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px', color: adminTheme.textBright }}>
                회원 상세 정보 관리 ({user.name || '이름 없음'})
            </h2>

            <div style={{ background: adminTheme.panelBg, borderRadius: '16px', border: `1px solid ${adminTheme.border}`, padding: '24px', marginBottom: '24px', boxShadow: adminTheme.shadow }}>
                <h3 style={{ fontSize: '14px', color: adminTheme.primary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                    <ShieldAlert size={16}/> 보안 및 접속 정보 (관리자 강제 수정)
                </h3>
                
                <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: adminTheme.textMuted, marginBottom: '4px' }}>아이디 (로그인 ID)</label>
                        <input type="text" value={formData.login_id} onChange={e => setFormData({...formData, login_id: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${adminTheme.border}`, background: '#F9F9FB', color: '#1C1C1E', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: adminTheme.textMuted, marginBottom: '4px' }}>환전 비밀번호 (4~6자리 숫자)</label>
                        <input type="text" value={formData.exchange_password} onChange={e => setFormData({...formData, exchange_password: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${adminTheme.border}`, background: '#F9F9FB', color: '#1C1C1E', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: adminTheme.textMuted, marginBottom: '4px' }}>인증된 휴대폰 번호</label>
                        <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${adminTheme.border}`, background: '#F9F9FB', color: '#1C1C1E', outline: 'none' }} />
                    </div>
                </div>

                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                    <button onClick={handleSave} style={{ background: adminTheme.primary, color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                        <Save size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }}/> 변경사항 저장
                    </button>
                </div>
            </div>
        </div>
    );
}