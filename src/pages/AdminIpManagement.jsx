// src/pages/AdminIpManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { ShieldBan, ShieldCheck, Plus, Trash2, Search } from 'lucide-react';

export default function AdminIpManagement() {
    const [blockedIps, setBlockedIps] = useState([]);
    const [newIp, setNewIp] = useState('');
    const [newReason, setNewReason] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadBlockedIps = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('blocked_ips').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setBlockedIps(data || []);
        } catch (error) {
            alert("차단 목록을 불러오지 못했습니다: " + error.message);
        }
        setIsLoading(false);
    };

    useEffect(() => { loadBlockedIps(); }, []);

    const handleAddBlock = async () => {
        if (!newIp.trim()) return alert("차단할 IP 주소를 입력하세요.");
        try {
            const { error } = await supabase.from('blocked_ips').insert([{ ip_address: newIp.trim(), reason: newReason || '관리자 수동 차단' }]);
            if (error) throw error;
            alert("🚨 IP가 차단되었습니다.");
            setNewIp(''); setNewReason('');
            loadBlockedIps();
        } catch (error) {
            alert("추가 실패: " + error.message);
        }
    };

    const handleUnblock = async (ip) => {
        if (!window.confirm(`[${ip}]\n해당 IP 차단을 영구 해제하시겠습니까?`)) return;
        try {
            const { error } = await supabase.from('blocked_ips').delete().eq('ip_address', ip);
            if (error) throw error;
            alert("✅ 차단이 해제되었습니다.");
            loadBlockedIps();
        } catch (error) {
            alert("해제 실패: " + error.message);
        }
    };

    return (
        <div style={{ padding: '24px', background: '#F8FAFC', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: '800', color: '#1E293B', marginBottom: '24px' }}>
                <ShieldBan size={24} color="#DC2626" /> 전체 차단 IP 관리
            </h2>

            {/* 수동 추가 영역 */}
            <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#334155' }}>새로운 IP 수동 차단</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="text" placeholder="예: 123.45.67.89" value={newIp} onChange={e=>setNewIp(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', width: '200px' }} />
                    <input type="text" placeholder="차단 사유 (선택)" value={newReason} onChange={e=>setNewReason(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', flex: 1 }} />
                    <button onClick={handleAddBlock} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1E293B', color: '#FFF', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}><Plus size={16}/> 차단 추가</button>
                </div>
            </div>

            {/* 목록 테이블 */}
            <div style={{ background: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead style={{ background: '#F1F5F9' }}>
                        <tr>
                            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700', borderBottom: '1px solid #E2E8F0' }}>차단된 IP 주소</th>
                            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700', borderBottom: '1px solid #E2E8F0' }}>차단 사유</th>
                            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700', borderBottom: '1px solid #E2E8F0' }}>차단 일시</th>
                            <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700', borderBottom: '1px solid #E2E8F0' }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>데이터를 불러오는 중입니다...</td></tr>
                        ) : blockedIps.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontWeight: '500' }}>현재 차단된 IP가 없습니다.</td></tr>
                        ) : blockedIps.map(ip => (
                            <tr key={ip.ip_address} style={{ '&:hover': { background: '#F8FAFC' } }}>
                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: '700', color: '#DC2626' }}>{ip.ip_address}</td>
                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', color: '#334155' }}>{ip.reason}</td>
                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '13px' }}>{new Date(ip.created_at).toLocaleString()}</td>
                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>
                                    <button onClick={() => handleUnblock(ip.ip_address)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', color: '#1E293B', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                        <ShieldCheck size={14} /> 차단 해제
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}