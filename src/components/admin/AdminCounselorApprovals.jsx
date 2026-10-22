// src/components/admin/AdminCounselorApprovals.jsx
import React, { useState, useEffect } from 'react';
import { supabase, adminRpcClient } from '../../api/supabaseClient';
import {
    CheckCircle2, Clock, XCircle, Search, RefreshCw,
    User, Phone, ShieldCheck, AlertCircle, Sparkles, Volume2,
    Award, FileText, ChevronRight, MessageSquare, Tag, Eye, EyeOff, ShieldAlert
} from 'lucide-react';
import { playAdminNotificationSound } from '../../utils/adminAlertSound';

export default function AdminCounselorApprovals({ adminTheme }) {
    const db = adminRpcClient || supabase;

    const [counselors, setCounselors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'hidden' | 'rejected' | 'all'
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [liveNotice, setLiveNotice] = useState('');

    // 반려 모달 상태
    const [rejectModalData, setRejectModalData] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // 🛡️ 긴급 비노출(숨김) 모달 상태
    const [hideModalData, setHideModalData] = useState(null);
    const [hideReason, setHideReason] = useState('부적절한 프로필 사진/이미지');

    // 1. 데이터 로드 (adminRpcClient 활용하여 RLS 제약 없이 모든 대기 목록 완전 조회)
    const fetchCounselors = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await db
                .from('counselor_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCounselors(data || []);
        } catch (err) {
            console.error("상담사 신청 목록 로드 실패:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. 실시간 감지 & 주기적 동기화 폴링 (알림음 재생)
    useEffect(() => {
        fetchCounselors();

        // 10초 주기 자동 갱신
        const interval = setInterval(async () => {
            try {
                const { data } = await db.from('counselor_profiles')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (data) setCounselors(data);
            } catch (e) {
                // 폴링 에러 무시
            }
        }, 10000);

        const channel = supabase
            .channel('admin-counselor-approvals-channel-desk')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'counselor_profiles' },
                (payload) => {
                    console.log('🔔 [어드민 대시보드] 신규 파트너 상담사 신청 감지:', payload.new);
                    // 1) 맑고 품격 있는 딩동 알림음 울리기!
                    playAdminNotificationSound();
                    
                    // 2) 실시간 안내 토스트 출력
                    setLiveNotice(`🔔 새로운 파트너 상담사 신청이 접수되었습니다! (${payload.new?.nickname || '신청자'})`);
                    setTimeout(() => setLiveNotice(''), 7000);

                    // 3) 목록 갱신
                    fetchCounselors();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'counselor_profiles' },
                () => {
                    fetchCounselors();
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, []);

    // 상태 판정 헬퍼
    const getStatus = (c) => {
        if (c.approval_status) return c.approval_status;
        if (c.is_approved) return 'approved';
        if (c.status_message?.startsWith('[반려') || c.rejection_reason) return 'rejected';
        return 'pending';
    };

    // 3. 승인 처리
    const handleApprove = async (counselor) => {
        if (!window.confirm(`[${counselor.nickname}] 님의 파트너 상담사 신청을 승인하시겠습니까?`)) return;

        setActionLoadingId(counselor.id);
        try {
            const updatePayload = {
                is_approved: true,
                status_message: '실시간 상담 가능합니다'
            };
            if ('approval_status' in counselor) {
                updatePayload.approval_status = 'approved';
            }

            const { error: cErr } = await db
                .from('counselor_profiles')
                .update(updatePayload)
                .eq('id', counselor.id);

            if (cErr) throw cErr;

            // 회원의 role을 'partner'로 승격
            if (counselor.user_id) {
                try {
                    await db
                        .from('profiles')
                        .update({ role: 'partner', membership_tier: 'partner' })
                        .eq('id', counselor.user_id);
                } catch (pErr) {
                    console.warn("프로필 role 업데이트 실패(무시):", pErr);
                }

                // 회원 알림 발송
                try {
                    await db
                        .from('notifications')
                        .insert({
                            user_id: counselor.user_id,
                            title: '🎉 파트너 상담사 신청 승인 완료!',
                            message: `축하합니다! ${counselor.nickname} 님의 파트너 상담사 입점 신청이 최종 승인되었습니다. 지금 프로필을 확인해보세요.`,
                            type: 'partner_approved',
                            is_read: false
                        });
                } catch (nErr) {
                    console.warn("알림 발송 실패(무시):", nErr);
                }
            }

            setLiveNotice(`[${counselor.nickname}] 님의 신청이 성공적으로 승인되었습니다.`);
            setTimeout(() => setLiveNotice(''), 4000);
            fetchCounselors();

        } catch (err) {
            console.error("승인 처리 실패:", err);
            alert("승인 처리 중 오류 발생: " + err.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    // 4. 대기 처리 (보류/검토)
    const handleHold = async (counselor) => {
        if (!window.confirm(`[${counselor.nickname}] 님의 상태를 '심사 대기'로 전환하시겠습니까?`)) return;

        setActionLoadingId(counselor.id);
        try {
            const updatePayload = {
                is_approved: false,
                status_message: '[심사대기] 신청서 검토 중입니다'
            };
            if ('approval_status' in counselor) {
                updatePayload.approval_status = 'pending';
            }

            const { error: cErr } = await db
                .from('counselor_profiles')
                .update(updatePayload)
                .eq('id', counselor.id);

            if (cErr) throw cErr;

            // 회원 role을 'user'로 유지
            if (counselor.user_id) {
                try {
                    await db
                        .from('profiles')
                        .update({ role: 'user', membership_tier: 'free' })
                        .eq('id', counselor.user_id);
                } catch (pHoldErr) {
                    console.warn("프로필 대기 상태 동기화 실패(무시):", pHoldErr);
                }
            }

            setLiveNotice(`[${counselor.nickname}] 님이 심사 대기 상태로 변경되었습니다.`);
            setTimeout(() => setLiveNotice(''), 4000);
            fetchCounselors();

        } catch (err) {
            console.error("대기 처리 실패:", err);
            alert("대기 처리 중 오류 발생: " + err.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    // 5. 반려 처리
    const handleOpenRejectModal = (counselor) => {
        setRejectModalData(counselor);
        setRejectReason(counselor.rejection_reason || '제출하신 프로필 및 자격 정보 보완이 필요합니다.');
    };

    const handleConfirmReject = async () => {
        if (!rejectModalData) return;
        const counselor = rejectModalData;

        setActionLoadingId(counselor.id);
        try {
            const reason = rejectReason.trim() || '관리자 검토 결과 반려되었습니다.';
            const updatePayload = {
                is_approved: false,
                status_message: `[반려] ${reason}`
            };
            if ('approval_status' in counselor) {
                updatePayload.approval_status = 'rejected';
                updatePayload.rejection_reason = reason;
            }

            const { error: cErr } = await db
                .from('counselor_profiles')
                .update(updatePayload)
                .eq('id', counselor.id);

            if (cErr) throw cErr;

            // 회원 role을 'user'로 유지
            if (counselor.user_id) {
                try {
                    await db
                        .from('profiles')
                        .update({ role: 'user', membership_tier: 'free' })
                        .eq('id', counselor.user_id);
                } catch (pRejErr) {
                    console.warn("프로필 반려 상태 동기화 실패(무시):", pRejErr);
                }

                // 회원에게 반려 알림 발송
                try {
                    await db
                        .from('notifications')
                        .insert({
                            user_id: counselor.user_id,
                            title: '⚠️ 파트너 상담사 신청 반려 안내',
                            message: `파트너 상담사 신청이 반려되었습니다.\n[사유: ${reason}]\n마이페이지에서 내용을 보완하여 재신청하실 수 있습니다.`,
                            type: 'partner_rejected',
                            is_read: false
                        });
                } catch (nRejErr) {
                    console.warn("반려 알림 발송 실패(무시):", nRejErr);
                }
            }

            setRejectModalData(null);
            setLiveNotice(`[${counselor.nickname}] 님의 신청이 반려 처리되었습니다.`);
            setTimeout(() => setLiveNotice(''), 4000);
            fetchCounselors();

        } catch (err) {
            console.error("반려 처리 실패:", err);
            alert("반려 처리 중 오류 발생: " + err.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    // 6. 🛡️ 비노출(숨김) 모달 오픈
    const handleOpenHideModal = (counselor) => {
        setHideModalData(counselor);
        setHideReason(counselor.hidden_reason || '부적절한 프로필 사진/이미지');
    };

    // 7. 🛡️ 긴급 비노출(숨김) 확정 처리
    const handleConfirmHide = async () => {
        if (!hideModalData) return;
        const counselor = hideModalData;
        const reason = hideReason.trim() || '관리자 검토 조치로 인한 비노출';

        setActionLoadingId(counselor.id);
        try {
            const { error } = await db
                .from('counselor_profiles')
                .update({
                    is_visible: false,
                    hidden_reason: reason,
                    hidden_at: new Date().toISOString()
                })
                .eq('id', counselor.id);

            if (error) {
                if (error.message?.includes('is_visible') || error.code === 'PGRST204') {
                    alert("⚠️ DB에 is_visible 컬럼이 아직 없습니다.\nSupabase SQL Editor에서 마이그레이션 스크립트를 실행해 주세요.");
                    return;
                }
                throw error;
            }

            // 상담사에게 비노출 안내 알림 발송
            if (counselor.user_id) {
                try {
                    await db
                        .from('notifications')
                        .insert({
                            user_id: counselor.user_id,
                            title: '⚠️ 상담사 프로필 비노출(숨김) 조치 안내',
                            message: `상담사 프로필이 관리자에 의해 비노출 처리되었습니다.\n[사유: ${reason}]\n프로필 내용을 확인 및 보완해주시기 바랍니다.`,
                            type: 'partner_rejected',
                            is_read: false
                        });
                } catch (nErr) {
                    console.warn("비노출 알림 발송 실패(무시):", nErr);
                }
            }

            setHideModalData(null);
            setLiveNotice(`[${counselor.nickname}] 님의 프로필이 즉시 비노출(숨김) 처리되었습니다.`);
            setTimeout(() => setLiveNotice(''), 4000);
            fetchCounselors();

        } catch (err) {
            console.error("비노출 처리 실패:", err);
            alert("비노출 처리 실패: " + err.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    // 8. 🛡️ 노출 재개 (정상 복원)
    const handleRestoreVisible = async (counselor) => {
        if (!window.confirm(`[${counselor.nickname}] 님의 프로필을 다시 사용자 화면에 정상 노출하시겠습니까?`)) return;

        setActionLoadingId(counselor.id);
        try {
            const { error } = await db
                .from('counselor_profiles')
                .update({
                    is_visible: true,
                    hidden_reason: null,
                    hidden_at: null
                })
                .eq('id', counselor.id);

            if (error) throw error;

            // 상담사에게 노출 재개 알림 발송
            if (counselor.user_id) {
                try {
                    await db
                        .from('notifications')
                        .insert({
                            user_id: counselor.user_id,
                            title: '✅ 상담사 프로필 정상 노출 재개 안내',
                            message: `축하합니다! ${counselor.nickname} 님의 프로필이 다시 일반 회원에게 정상 노출됩니다.`,
                            type: 'partner_approved',
                            is_read: false
                        });
                } catch (nErr) {
                    console.warn("노출 재개 알림 실패(무시):", nErr);
                }
            }

            setLiveNotice(`[${counselor.nickname}] 님의 프로필이 정상 노출 상태로 복원되었습니다.`);
            setTimeout(() => setLiveNotice(''), 4000);
            fetchCounselors();

        } catch (err) {
            console.error("노출 재개 실패:", err);
            alert("노출 재개 실패: " + err.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    // 9. 필터링 연산
    const filteredList = counselors.filter(c => {
        const status = getStatus(c);
        if (activeTab === 'pending' && status !== 'pending') return false;
        if (activeTab === 'approved' && (status !== 'approved' || c.is_visible === false)) return false;
        if (activeTab === 'hidden' && c.is_visible !== false) return false;
        if (activeTab === 'rejected' && status !== 'rejected') return false;

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            const matchNick = (c.nickname || '').toLowerCase().includes(q);
            const matchPhone = (c.contact_phone || '').includes(q);
            const matchTitle = (c.title || '').toLowerCase().includes(q);
            return matchNick || matchPhone || matchTitle;
        }
        return true;
    });

    const pendingCount = counselors.filter(c => getStatus(c) === 'pending').length;
    const approvedCount = counselors.filter(c => getStatus(c) === 'approved' && c.is_visible !== false).length;
    const hiddenCount = counselors.filter(c => c.is_visible === false).length;
    const rejectedCount = counselors.filter(c => getStatus(c) === 'rejected').length;

    return (
        <div className="ios-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-wrap { width: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif; }
                .ios-title { font-size: 26px; font-weight: 800; color: #1C1C1E; margin: 0 0 6px 0; letter-spacing: -0.5px; }
                .ios-desc { font-size: 13.5px; color: #8E8E93; margin: 0 0 20px 0; font-weight: 500; }
                
                .counselor-card {
                    background: #FFFFFF;
                    border: 0.5px solid #E5E5EA;
                    border-radius: 14px;
                    padding: 20px;
                    margin-bottom: 16px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                    transition: transform 0.15s, box-shadow 0.15s;
                }
                .counselor-card:hover {
                    box-shadow: 0 6px 16px rgba(0,0,0,0.05);
                }

                .badge-status {
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 4px 9px; border-radius: 6px; font-size: 11.5px; font-weight: 800;
                }
                .badge-status.pending { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
                .badge-status.approved { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
                .badge-status.rejected { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }

                .action-btn-pill {
                    display: inline-flex; align-items: center; justify-content: center; gap: 5px;
                    padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 800;
                    cursor: pointer; border: none; transition: 0.15s; white-space: nowrap;
                }
                .action-btn-pill:active { transform: scale(0.96); }
                .action-btn-pill.approve { background: #10B981; color: #FFFFFF; }
                .action-btn-pill.approve:hover { background: #059669; }
                .action-btn-pill.hold { background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; }
                .action-btn-pill.hold:hover { background: #E5E7EB; }
                .action-btn-pill.reject { background: #FEE2E2; color: #DC2626; }
                .action-btn-pill.reject:hover { background: #FCA5A5; }

                .tab-chip {
                    padding: 9px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 700;
                    cursor: pointer; border: none; background: #F2F2F7; color: #475569;
                    display: flex; align-items: center; gap: 6px; transition: 0.15s;
                }
                .tab-chip.active {
                    background: #007AFF; color: #FFFFFF; font-weight: 800;
                }
            `}} />

            {/* 상단 타이틀 & 알림음 테스트 바 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="ios-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={26} color="#007AFF" />
                        파트너 상담사 승인 관리
                    </h1>
                    <p className="ios-desc">
                        일반 회원의 파트너 상담사 입점 신청을 심사하고 승인·대기·반려를 실시간으로 처리합니다.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={playAdminNotificationSound}
                        style={{
                            background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#7C3AED',
                            padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '800',
                            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                        }}
                    >
                        <Volume2 size={16} /> 🔔 알림음 테스트
                    </button>
                    <button
                        type="button"
                        onClick={fetchCounselors}
                        style={{
                            background: '#FFFFFF', border: '1px solid #E5E5EA', color: '#1C1C1E',
                            padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={14} /> 새로고침
                    </button>
                </div>
            </div>

            {/* 실시간 알림 토스트 배너 */}
            {liveNotice && (
                <div style={{
                    backgroundColor: '#ECFDF5', border: '1.5px solid #10B981', color: '#065F46',
                    padding: '14px 18px', borderRadius: '10px', marginBottom: '18px',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '800',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                }}>
                    <Sparkles size={20} color="#059669" />
                    <span>{liveNotice}</span>
                </div>
            )}

            {/* 탭 네비게이션 & 검색 바 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className={`tab-chip ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        <Clock size={15} />
                        <span>승인 대기</span>
                        {pendingCount > 0 && (
                            <span style={{ backgroundColor: '#EF4444', color: '#FFFFFF', fontSize: '11px', fontWeight: '900', padding: '1px 7px', borderRadius: '999px' }}>
                                {pendingCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        className={`tab-chip ${activeTab === 'approved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('approved')}
                    >
                        <CheckCircle2 size={15} />
                        <span>정상 노출 ({approvedCount})</span>
                    </button>

                    <button
                        type="button"
                        className={`tab-chip ${activeTab === 'hidden' ? 'active' : ''}`}
                        onClick={() => setActiveTab('hidden')}
                        style={hiddenCount > 0 ? { borderColor: '#FECDD3', color: activeTab === 'hidden' ? '#FFFFFF' : '#E11D48', background: activeTab === 'hidden' ? '#E11D48' : '#FFF1F2' } : {}}
                    >
                        <EyeOff size={15} />
                        <span>비노출 숨김 ({hiddenCount})</span>
                    </button>

                    <button
                        type="button"
                        className={`tab-chip ${activeTab === 'rejected' ? 'active' : ''}`}
                        onClick={() => setActiveTab('rejected')}
                    >
                        <XCircle size={15} />
                        <span>반려됨 ({rejectedCount})</span>
                    </button>

                    <button
                        type="button"
                        className={`tab-chip ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        <span>전체보기 ({counselors.length})</span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5E5EA', borderRadius: '8px', padding: '6px 12px', minWidth: '220px' }}>
                    <Search size={15} color="#8E8E93" style={{ marginRight: '6px' }} />
                    <input
                        type="text"
                        placeholder="이름, 닉네임, 연락처 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', width: '100%' }}
                    />
                </div>
            </div>

            {/* 카드 리스트 */}
            {isLoading ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: '#8E8E93' }}>
                    신청 내역 불러오는 중...
                </div>
            ) : filteredList.length === 0 ? (
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E5EA', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#8E8E93' }}>
                    <Clock size={36} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#475569' }}>
                        {activeTab === 'pending' ? '현재 승인 대기 중인 신청 건이 없습니다.' : '해당 조건의 상담사 내역이 없습니다.'}
                    </p>
                </div>
            ) : (
                filteredList.map((c) => {
                    const status = getStatus(c);
                    const isActing = actionLoadingId === c.id;

                    return (
                        <div key={c.id} className="counselor-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '60px', height: '60px', borderRadius: '12px',
                                        overflow: 'hidden', backgroundColor: '#F2F2F7', flexShrink: 0,
                                        border: '1px solid #E5E5EA'
                                    }}>
                                        {c.avatar_url ? (
                                            <img src={c.avatar_url} alt={c.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#8E8E93' }}>
                                                <User size={24} />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1C1C1E' }}>
                                                {c.nickname}
                                            </span>
                                            {status === 'pending' && <span className="badge-status pending"><Clock size={11} /> 심사대기</span>}
                                            {status === 'approved' && <span className="badge-status approved"><CheckCircle2 size={11} /> 승인완료</span>}
                                            {status === 'rejected' && <span className="badge-status rejected"><XCircle size={11} /> 반려됨</span>}

                                            {/* 🛡️ 프로필 노출/비노출 상태 뱃지 */}
                                            {c.is_visible === false ? (
                                                <span className="badge-status hidden" style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}>
                                                    <EyeOff size={11} /> 비노출 숨김
                                                </span>
                                            ) : (
                                                status === 'approved' && (
                                                    <span className="badge-status visible" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                                                        <Eye size={11} /> 서비스 노출중
                                                    </span>
                                                )
                                            )}
                                        </div>

                                        <div style={{ fontSize: '13px', color: '#007AFF', fontWeight: '700', marginBottom: '4px' }}>
                                            {c.title || '전문 상담사'}
                                        </div>

                                        <div style={{ fontSize: '12.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                            {c.contact_phone && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Phone size={12} /> {c.contact_phone}
                                                </span>
                                            )}
                                            <span>신청일: {c.applied_at ? new Date(c.applied_at).toLocaleDateString() : (c.created_at ? new Date(c.created_at).toLocaleDateString() : '-')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 4개 조작 버튼: [노출/비노출 스위치], [승인], [대기], [반려] */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    {/* 🛡️ 원클릭 긴급 노출 / 비노출 제어 스위치 */}
                                    {c.is_visible === false ? (
                                        <button
                                            type="button"
                                            disabled={isActing}
                                            onClick={() => handleRestoreVisible(c)}
                                            className="action-btn-pill"
                                            style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}
                                            title="사용자 화면에 정상 노출 재개"
                                        >
                                            <Eye size={14} /> 노출 재개
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={isActing}
                                            onClick={() => handleOpenHideModal(c)}
                                            className="action-btn-pill"
                                            style={{ background: '#FFF1F2', color: '#BE123C', border: '1px solid #FECDD3' }}
                                            title="악성 프로필 발견 시 즉시 사용자 화면에서 비노출 은폐"
                                        >
                                            <EyeOff size={14} /> 비노출 전환
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        disabled={isActing}
                                        onClick={() => handleApprove(c)}
                                        className="action-btn-pill approve"
                                        title="파트너 자격 부여 및 프로필 승인"
                                    >
                                        <CheckCircle2 size={14} /> 승인
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isActing}
                                        onClick={() => handleHold(c)}
                                        className="action-btn-pill hold"
                                        title="심사 대기 상태로 유지/보류"
                                    >
                                        <Clock size={14} /> 대기
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isActing}
                                        onClick={() => handleOpenRejectModal(c)}
                                        className="action-btn-pill reject"
                                        title="신청 사유를 입력하여 반려"
                                    >
                                        <XCircle size={14} /> 반려
                                    </button>
                                </div>
                            </div>

                            {/* 🛡️ 비노출(숨김) 경고 박스 */}
                            {c.is_visible === false && (
                                <div style={{ background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#991B1B', fontWeight: '700', marginBottom: '12px' }}>
                                    🚨 관리자 비노출(숨김) 조치 중: {c.hidden_reason || '관리자 검토 조치'}
                                    {c.hidden_at && <span style={{ fontSize: '11px', color: '#B91C1C', marginLeft: '8px', fontWeight: '500' }}>({new Date(c.hidden_at).toLocaleString()})</span>}
                                </div>
                            )}

                            {/* 전문 분야 & 카테고리 */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                {Array.isArray(c.categories) && c.categories.map((cat, i) => (
                                    <span key={i} style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: '700' }}>
                                        {cat}
                                    </span>
                                ))}
                                {Array.isArray(c.specialties) && c.specialties.map((sp, i) => (
                                    <span key={i} style={{ background: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: '600' }}>
                                        #{sp}
                                    </span>
                                ))}
                            </div>

                            {/* 소개문 & 반려사유 */}
                            {c.introduction && (
                                <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', margin: '0 0 10px 0', background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px' }}>
                                    {c.introduction}
                                </p>
                            )}

                            {status === 'rejected' && (c.rejection_reason || c.status_message) && (
                                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#991B1B', fontWeight: '700' }}>
                                    📌 반려 사유: {c.rejection_reason || c.status_message.replace('[반려]', '').trim()}
                                </div>
                            )}

                            {/* 상담료 안내 */}
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '10px', marginTop: '10px' }}>
                                <span>30분 상담: <strong style={{ color: '#0F172A' }}>{(c.price_30min || 50000).toLocaleString()}원</strong></span>
                                <span>60분 상담: <strong style={{ color: '#0F172A' }}>{(c.price_60min || 100000).toLocaleString()}원</strong></span>
                                <span>상담방식: <strong style={{ color: '#0F172A' }}>{Array.isArray(c.consult_methods) ? c.consult_methods.join(', ') : '전화상담'}</strong></span>
                            </div>
                        </div>
                    );
                })
            )}

            {/* 반려 사유 입력 모달 */}
            {rejectModalData && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 99999, padding: '20px'
                }}>
                    <div style={{
                        background: '#FFFFFF', borderRadius: '14px', width: '100%', maxWidth: '440px',
                        padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', borderTop: '4px solid #EF4444'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1C1C1E', margin: '0 0 8px 0' }}>
                            파트너 신청 반려 사유 입력
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0' }}>
                            <strong>[{rejectModalData.nickname}]</strong> 님에게 전송될 반려 사유를 작성하세요. 신청자는 마이페이지에서 사유를 확인하고 보완할 수 있습니다.
                        </p>

                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="예: 자격증 확인을 위한 경력 증빙 서류 보완이 필요합니다."
                            rows={4}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                                fontSize: '13.5px', outline: 'none', boxSizing: 'border-box', marginBottom: '18px'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setRejectModalData(null)}
                                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReject}
                                style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#EF4444', color: '#FFFFFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                            >
                                반려 확정
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛡️ 프로필 긴급 비노출(숨김) 사유 입력 모달 */}
            {hideModalData && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 99999, padding: '20px'
                }}>
                    <div style={{
                        background: '#FFFFFF', borderRadius: '14px', width: '100%', maxWidth: '460px',
                        padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', borderTop: '4px solid #E11D48'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <ShieldAlert size={20} color="#E11D48" />
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1C1C1E', margin: 0 }}>
                                상담사 프로필 즉시 비노출(숨김)
                            </h3>
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                            <strong>[{hideModalData.nickname}]</strong> 님의 프로필이 사용자 화면에서 <strong>즉시 100% 감춰집니다.</strong><br />
                            상담사에게 전달할 비노출 사유를 선택하거나 입력하세요.
                        </p>

                        {/* 프리셋 사유 버튼들 */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                            {[
                                '부적절한 프로필 사진/이미지',
                                '허위 이력 및 과장 광고',
                                '외부 직거래/불법 연락처 유도',
                                '욕설/비방/선정적 문구 포함',
                                '운영 원칙 위반 검토 중'
                            ].map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setHideReason(preset)}
                                    style={{
                                        background: hideReason === preset ? '#FFE4E6' : '#F8FAFC',
                                        border: `1px solid ${hideReason === preset ? '#FDA4AF' : '#E2E8F0'}`,
                                        color: hideReason === preset ? '#9F1239' : '#475569',
                                        padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px',
                                        fontWeight: '700', cursor: 'pointer'
                                    }}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={hideReason}
                            onChange={(e) => setHideReason(e.target.value)}
                            placeholder="상담사에게 전달할 비노출 사유를 입력하세요..."
                            rows={3}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                                fontSize: '13.5px', outline: 'none', boxSizing: 'border-box', marginBottom: '18px'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setHideModalData(null)}
                                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmHide}
                                style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#E11D48', color: '#FFFFFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                            >
                                즉시 비노출 확정
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
