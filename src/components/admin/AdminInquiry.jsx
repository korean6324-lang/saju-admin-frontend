// src/components/admin/AdminInquiry.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Clock, CheckCircle2, CornerDownRight } from 'lucide-react';

export default function AdminInquiry({ adminTheme }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'answered'
    const [replyText, setReplyText] = useState({}); // 각 문의글별 답변 입력 상태 관리
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 모든 문의 내역 불러오기 (유저 정보 포함)
    const { data: inquiries = [], isLoading } = useQuery({
        queryKey: ['adminInquiries', activeTab],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('customer_inquiries')
                .select('*, profiles:user_id(email, name)')
                .eq('status', activeTab)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // 관리자 답변 등록 핸들러
    const handleReply = async (id) => {
        const reply = replyText[id];
        if (!reply || !reply.trim()) return alert("답변 내용을 입력해주세요.");
        if (!window.confirm("답변을 등록하시겠습니까?\n등록 후 고객의 마이페이지에 실시간으로 노출됩니다.")) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('customer_inquiries')
                .update({
                    admin_reply: reply.trim(),
                    status: 'answered',
                    replied_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            alert("✅ 답변이 성공적으로 등록되었습니다.");
            setReplyText(prev => ({ ...prev, [id]: '' })); // 입력창 초기화
            queryClient.invalidateQueries(['adminInquiries']); // 목록 새로고침
        } catch (error) {
            alert(`❌ 답변 등록 실패: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: adminTheme.textBright, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>1:1 문의 관리</h2>
                <p style={{ fontSize: '14px', color: adminTheme.textMuted, margin: 0 }}>고객이 남긴 문의를 확인하고 답변을 작성합니다.</p>
            </div>

            {/* 필터 탭 */}
            <div style={{ display: 'inline-flex', background: '#E2E8F0', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
                <button style={tabStyle(activeTab === 'pending')} onClick={() => setActiveTab('pending')}>
                    <Clock size={16}/> 답변 대기중
                </button>
                <button style={tabStyle(activeTab === 'answered')} onClick={() => setActiveTab('answered')}>
                    <CheckCircle2 size={16}/> 답변 완료됨
                </button>
            </div>

            {/* 문의 리스트 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {isLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: adminTheme.textMuted }}>데이터 불러오는 중...</div>
                ) : inquiries.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: adminTheme.textMuted, background: adminTheme.panelBg, borderRadius: '12px' }}>
                        {activeTab === 'pending' ? '대기 중인 문의가 없습니다. 훌륭합니다!' : '완료된 문의가 없습니다.'}
                    </div>
                ) : (
                    inquiries.map(item => (
                        <div key={item.id} style={{ background: adminTheme.panelBg, borderRadius: '16px', border: `1px solid ${adminTheme.border}`, padding: '24px', boxShadow: adminTheme.shadow }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: adminTheme.primary, marginBottom: '4px' }}>
                                        {item.profiles?.name || '회원'} <span style={{ color: adminTheme.textMuted, fontWeight: '500' }}>({item.contact_email})</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: adminTheme.textMuted }}>
                                        신청일: {new Date(item.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', 
                                    backgroundColor: item.status === 'pending' ? '#FEF3C7' : '#DCFCE7', 
                                    color: item.status === 'pending' ? '#D97706' : '#16A34A' }}>
                                    {item.status === 'pending' ? '답변 대기중' : '답변 완료'}
                                </div>
                            </div>
                            
                            {/* 고객 문의 내용 */}
                            <div style={{ fontSize: '15px', color: adminTheme.textBright, lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                                {item.content}
                            </div>

                            {/* 답변 폼 (대기중일 때만 노출) */}
                            {item.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <CornerDownRight size={20} color={adminTheme.textMuted} style={{ marginTop: '12px' }}/>
                                    <div style={{ flex: 1 }}>
                                        <textarea 
                                            value={replyText[item.id] || ''} 
                                            onChange={(e) => setReplyText({ ...replyText, [item.id]: e.target.value })}
                                            placeholder="고객에게 전달할 답변을 작성해주세요."
                                            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: `1px solid ${adminTheme.border}`, fontSize: '14px', minHeight: '100px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                                        />
                                        <div style={{ textAlign: 'right', marginTop: '12px' }}>
                                            <button 
                                                onClick={() => handleReply(item.id)} 
                                                disabled={isSubmitting}
                                                style={{ background: adminTheme.primary, color: '#FFF', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                                                {isSubmitting ? '등록 중...' : '답변 등록하기'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* 완료된 답변 보기 */
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <CornerDownRight size={20} color={adminTheme.primary} style={{ marginTop: '12px' }}/>
                                    <div style={{ flex: 1, backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: adminTheme.primary, marginBottom: '8px' }}>관리자 답변</div>
                                        <div style={{ fontSize: '14px', color: adminTheme.textBright, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                            {item.admin_reply}
                                        </div>
                                        <div style={{ fontSize: '11px', color: adminTheme.textMuted, marginTop: '8px', textAlign: 'right' }}>
                                            답변일: {new Date(item.replied_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

const tabStyle = (isActive) => ({ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', backgroundColor: isActive ? '#FFFFFF' : 'transparent', color: isActive ? '#0F172A' : '#64748B', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.04)' : 'none' });