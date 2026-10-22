// src/components/admin/AdminOverview.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, adminRpcClient } from '../../api/supabaseClient';
import { Users, Crown, Store, Sparkles, ScrollText, Info, Clock, ShieldCheck, ChevronRight } from 'lucide-react';

export default function AdminOverview({ adminTheme, onNavigateTab }) {
    
    // ==========================================================
    // 1. 핵심 지표 병렬 페칭 (캐시 제거 & 파트너 상담사 대기 현황 연동)
    // ==========================================================
    const { data: stats, isLoading } = useQuery({
        queryKey: ['adminDashboardStats'],
        queryFn: async () => {
            const dbClient = adminRpcClient || supabase;
            // Promise.all을 통해 쿼리를 동시에 실행하여 속도 극대화
            const [usersReq, vipReq, partnersReq, ticketsReq, pendingCounselorsReq, approvedCounselorsReq] = await Promise.all([
                // 1. 전체 회원 수
                dbClient.from('profiles').select('id', { count: 'exact', head: true }),
                // 2. 일반 회원 수 (role이 user인 유저)
                dbClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
                // 3. 승인된 파트너 수
                dbClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'partner'),
                // 4. 통합된 'ticket_count' 컬럼 요청
                dbClient.from('profiles').select('ticket_count'),
                // 5. 파트너 상담사 승인 대기 수 (is_approved = false)
                dbClient.from('counselor_profiles').select('id', { count: 'exact', head: true }).eq('is_approved', false),
                // 6. 파트너 상담사 승인 완료 수 (is_approved = true)
                dbClient.from('counselor_profiles').select('id', { count: 'exact', head: true }).eq('is_approved', true)
            ]);

            // 통합 열람권 총합 계산
            const totalTickets = ticketsReq.data?.reduce((acc, curr) => acc + (curr.ticket_count || 0), 0) || 0;

            return {
                totalUsers: usersReq.count || 0,
                regularUsers: vipReq.count || 0,
                vipUsers: vipReq.count || 0,
                partners: partnersReq.count || 0,
                totalTickets: totalTickets,
                pendingCounselors: pendingCounselorsReq.count || 0,
                approvedCounselors: approvedCounselorsReq.count || 0
            };
        }
    });

    return (
        <div className="ios-overview-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-overview-wrap {
                    width: 100%; box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif;
                    background-color: transparent;
                }

                .ios-title { font-size: 28px; font-weight: 800; color: #1C1C1E; margin: 0 0 8px 0; letter-spacing: -0.5px; }
                .ios-desc { font-size: 14px; color: #8E8E93; margin: 0 0 32px 0; font-weight: 500; }

                /* iOS Inset Grouped 리스트 스타일 */
                .ios-group-title {
                    font-size: 13px; font-weight: 600; color: #8E8E93; text-transform: uppercase;
                    margin: 0 0 8px 16px; letter-spacing: -0.3px;
                }
                .ios-list-group {
                    background-color: #FFFFFF; border-radius: 16px; margin-bottom: 32px;
                    overflow: hidden; border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .ios-list-row {
                    display: flex; align-items: center; justify-content: space-between;
                    min-height: 52px; padding: 12px 16px; border-bottom: 0.5px solid #E5E5EA;
                }
                .ios-list-row:last-child { border-bottom: none; }

                /* 아이콘 및 레이블 */
                .ios-label-wrap { display: flex; align-items: center; gap: 14px; flex: 1; }
                .ios-icon-box {
                    width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #FFFFFF;
                }
                .ios-label { font-size: 15px; font-weight: 600; color: #1C1C1E; letter-spacing: -0.3px; }

                /* 값(Value) 표시 영역 */
                .ios-value-wrap { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
                .ios-value-number { font-size: 18px; font-weight: 800; color: #1C1C1E; letter-spacing: -0.5px; }
                .ios-value-unit { font-size: 14px; color: #8E8E93; font-weight: 600; }

                /* 안내 텍스트 블록 */
                .ios-info-box {
                    background-color: #F9F9FB; padding: 20px; font-size: 13px; color: #3A3A3C; line-height: 1.6; font-weight: 500;
                }
                .ios-info-box ul { margin: 0; padding-left: 20px; }
                .ios-info-box li { margin-bottom: 6px; }
                .ios-info-box li:last-child { margin-bottom: 0; }

                .ios-empty-state { padding: 40px 20px; text-align: center; color: #8E8E93; font-size: 14px; font-weight: 600; }
                .lucide-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                @media (max-width: 768px) {
                    .ios-title { font-size: 22px; }
                    .ios-desc { margin-bottom: 20px; }
                    .ios-list-row { padding: 12px 14px; }
                    .ios-label { font-size: 14px; }
                    .ios-value-number { font-size: 16px; }
                    .ios-info-box { padding: 16px 14px; }
                }
            `}} />

            <div>
                <h1 className="ios-title">대시보드 통계</h1>
                <p className="ios-desc">플랫폼의 핵심 가입자 지표 및 열람권 발행 현황을 요약하여 보여줍니다.</p>
            </div>

            {/* 🚨 파트너 상담사 입점 승인 대기 알림 배너 */}
            {(stats?.pendingCounselors || 0) > 0 && (
                <div
                    onClick={() => onNavigateTab && onNavigateTab('counselor_approvals')}
                    style={{
                        backgroundColor: '#FFFBEB', border: '1.5px solid #F59E0B',
                        borderRadius: '14px', padding: '16px 20px', marginBottom: '24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)',
                        transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ background: '#F59E0B', color: '#FFF', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Clock size={22} />
                        </div>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🔔 파트너 상담사 입점 신청 {stats.pendingCounselors}건 대기 중</span>
                                <span style={{ background: '#EF4444', color: '#FFFFFF', fontSize: '11px', fontWeight: '900', padding: '2px 8px', borderRadius: '999px' }}>
                                    심사 필요
                                </span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#B45309', marginTop: '2px' }}>
                                일반 회원의 상담사 입점 신청이 접수되었습니다. 지금 검토하고 승인·대기·반려를 진행하세요.
                            </div>
                        </div>
                    </div>
                    <div style={{ background: '#F59E0B', color: '#FFFFFF', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        심사하기 <ChevronRight size={16} />
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="ios-list-group">
                    <div className="ios-empty-state">
                        <span className="lucide-spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>⏳</span>
                        통계 데이터를 실시간으로 집계 중입니다...
                    </div>
                </div>
            ) : (
                <>
                    {/* 1. 가입자 및 파트너 현황 */}
                    <div className="ios-group-title">사용자 및 파트너 지표 현황</div>
                    <div className="ios-list-group">
                        <div className="ios-list-row">
                            <div className="ios-label-wrap">
                                <div className="ios-icon-box" style={{ background: '#007AFF' }}><Users size={18} /></div>
                                <span className="ios-label">플랫폼 누적 가입자</span>
                            </div>
                            <div className="ios-value-wrap">
                                <span className="ios-value-number">{(stats?.totalUsers ?? 0).toLocaleString()}</span>
                                <span className="ios-value-unit">명</span>
                            </div>
                        </div>

                        <div className="ios-list-row">
                            <div className="ios-label-wrap">
                                <div className="ios-icon-box" style={{ background: '#FF9500' }}><Crown size={18} /></div>
                                <span className="ios-label">일반 회원 (회원)</span>
                            </div>
                            <div className="ios-value-wrap">
                                <span className="ios-value-number" style={{ color: '#FF9500' }}>{(stats?.regularUsers ?? stats?.vipUsers ?? 0).toLocaleString()}</span>
                                <span className="ios-value-unit">명</span>
                            </div>
                        </div>

                        {/* 파트너 상담사 승인 대기 */}
                        <div className="ios-list-row" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('counselor_approvals')}>
                            <div className="ios-label-wrap">
                                <div className="ios-icon-box" style={{ background: '#EF4444' }}><Clock size={18} /></div>
                                <span className="ios-label">파트너 상담사 입점 승인 대기</span>
                            </div>
                            <div className="ios-value-wrap">
                                <span className="ios-value-number" style={{ color: (stats?.pendingCounselors || 0) > 0 ? '#EF4444' : '#1C1C1E' }}>
                                    {(stats?.pendingCounselors ?? 0).toLocaleString()}
                                </span>
                                <span className="ios-value-unit">건</span>
                                {(stats?.pendingCounselors || 0) > 0 && (
                                    <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '11px', fontWeight: '800', padding: '2px 7px', borderRadius: '999px', marginLeft: '6px' }}>
                                        심사필요
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 승인된 파트너 상담사 */}
                        <div className="ios-list-row" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('counselor_approvals')}>
                            <div className="ios-label-wrap">
                                <div className="ios-icon-box" style={{ background: '#34C759' }}><ShieldCheck size={18} /></div>
                                <span className="ios-label">승인된 파트너 상담사</span>
                            </div>
                            <div className="ios-value-wrap">
                                <span className="ios-value-number" style={{ color: '#34C759' }}>{(stats?.approvedCounselors ?? stats?.partners ?? 0).toLocaleString()}</span>
                                <span className="ios-value-unit">명</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. 열람권 발행 현황 패널 */}
                    <div className="ios-group-title">열람권 누적 발행 현황</div>
                    <div className="ios-list-group">
                        {/* 🚨 에러 해결: 통합된 열람권 1개만 표시하도록 변경 */}
                        <div className="ios-list-row">
                            <div className="ios-label-wrap">
                                <div className="ios-icon-box" style={{ background: '#AF52DE' }}><Sparkles size={18} /></div>
                                <span className="ios-label">통합 열람권 잔여 총합</span>
                            </div>
                            <div className="ios-value-wrap">
                                <span className="ios-value-number" style={{ color: '#AF52DE' }}>{(stats?.totalTickets ?? 0).toLocaleString()}</span>
                                <span className="ios-value-unit">장</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* 3. 안내 영역 */}
            <div className="ios-group-title">시스템 안내</div>
            <div className="ios-list-group">
                <div className="ios-list-row" style={{ backgroundColor: '#F9F9FB', borderBottom: '1px solid #E5E5EA' }}>
                    <div className="ios-label-wrap">
                        <Info size={18} color="#8E8E93" />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1C1C1E' }}>어드민 시스템 요약</span>
                    </div>
                </div>
                <div className="ios-info-box">
                    <ul>
                        <li>좌측 <strong>[회원관리]</strong> 메뉴에서 개별 유저를 검색하여 직접 열람권을 지급하거나 차감할 수 있습니다.</li>
                        <li>파트너 입점 대기열 승인 및 상점 활성화 상태 변경 또한 회원관리에서 처리합니다.</li>
                        <li>본 대시보드의 실시간 매출 차트 및 스토어 정산 그래프는 차기 마일스톤(V4)에서 업데이트될 예정입니다.</li>
                    </ul>
                </div>
            </div>

        </div>
    );
}