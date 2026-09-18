// src/components/admin/AdminOverview.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { Users, Crown, Store, Coins, TrendingUp } from 'lucide-react';

export default function AdminOverview({ adminTheme }) {
    
    // ==========================================================
    // 1. 핵심 지표 병렬 페칭 (속도 극대화)
    // ==========================================================
    const { data: stats, isLoading } = useQuery({
        queryKey: ['adminDashboardStats'],
        queryFn: async () => {
            // Promise.all을 통해 4개의 카운트 쿼리를 동시에 실행
            const [usersReq, vipReq, partnersReq, cashReq] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                // 🚨 수정된 부분: is_vip 대신 실제 존재하는 subscription_tier가 'free'가 아닌 유저를 찾습니다.
                supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('subscription_tier', 'free'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'partner'),
                supabase.from('cash_transactions').select('amount') // 단순 예시: 실제로는 서버 RPC 권장
            ]);

            return {
                totalUsers: usersReq.count || 0,
                vipUsers: vipReq.count || 0,
                partners: partnersReq.count || 0,
                // 총 발행 캐시는 계산 로직이 필요하므로 임시값 처리
                totalCashVolume: cashReq.data ? cashReq.data.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) : 0 
            };
        }
    });

    // ==========================================================
    // 🎨 엔터프라이즈 화이트 테마 스타일 (12~13px 고밀도)
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '24px' },
        
        // 꽉 찬 표 형태의 그리드 위젯
        widgetGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '30px' },
        widgetBox: { border: `1px solid ${adminTheme.border}`, backgroundColor: '#FFF', display: 'flex', alignItems: 'center' },
        widgetIconArea: { width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${adminTheme.border}` },
        widgetTextArea: { flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
        widgetLabel: { fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '4px' },
        widgetValue: { fontSize: '24px', fontWeight: '900', color: '#111' },
    };

    if (isLoading) return <div style={{ padding: '40px', color: '#999', fontSize: '13px' }}>통계 데이터를 집계 중입니다...</div>;

    return (
        <div style={styles.container}>
            {/* 1. 상단 타이틀 */}
            <div>
                <h2 style={styles.headerTitle}>서비스 대시보드 요약</h2>
                <p style={styles.headerSub}>[서비스 관리 &gt; 대시보드 통계] 플랫폼의 핵심 가입자 지표 및 자산 흐름을 요약하여 보여줍니다.</p>
            </div>

            {/* 2. 고밀도 통계 위젯 (표/그리드 형태) */}
            <div style={styles.widgetGrid}>
                {/* 누적 가입자 */}
                <div style={styles.widgetBox}>
                    <div style={{ ...styles.widgetIconArea, backgroundColor: '#F0F9FF' }}>
                        <Users size={32} color="#0ea5e9" />
                    </div>
                    <div style={styles.widgetTextArea}>
                        <div style={styles.widgetLabel}>플랫폼 누적 가입자</div>
                        <div style={styles.widgetValue}>{stats?.totalUsers.toLocaleString()} <span style={{fontSize:'12px', color:'#999'}}>명</span></div>
                    </div>
                </div>

                {/* VIP 결제 유저 */}
                <div style={styles.widgetBox}>
                    <div style={{ ...styles.widgetIconArea, backgroundColor: '#FEFCE8' }}>
                        <Crown size={32} color="#d97706" />
                    </div>
                    <div style={styles.widgetTextArea}>
                        <div style={styles.widgetLabel}>VIP (1회 이상 결제)</div>
                        <div style={styles.widgetValue}>{stats?.vipUsers.toLocaleString()} <span style={{fontSize:'12px', color:'#999'}}>명</span></div>
                    </div>
                </div>

                {/* 파트너 입점 수 */}
                <div style={styles.widgetBox}>
                    <div style={{ ...styles.widgetIconArea, backgroundColor: '#ECFDF5' }}>
                        <Store size={32} color="#059669" />
                    </div>
                    <div style={styles.widgetTextArea}>
                        <div style={styles.widgetLabel}>승인된 스토어 파트너</div>
                        <div style={styles.widgetValue}>{stats?.partners.toLocaleString()} <span style={{fontSize:'12px', color:'#999'}}>명</span></div>
                    </div>
                </div>

                {/* 사마캐시 유통량 */}
                <div style={styles.widgetBox}>
                    <div style={{ ...styles.widgetIconArea, backgroundColor: '#F3F4F6' }}>
                        <Coins size={32} color="#4B5563" />
                    </div>
                    <div style={styles.widgetTextArea}>
                        <div style={styles.widgetLabel}>사마캐시 누적 거래량</div>
                        <div style={styles.widgetValue}>{stats?.totalCashVolume.toLocaleString()} <span style={{fontSize:'12px', color:'#999'}}>C</span></div>
                    </div>
                </div>
            </div>

            {/* 3. 안내 영역 (테이블형) */}
            <div style={{ border: `1px solid ${adminTheme.border}`, backgroundColor: '#F9FAFB' }}>
                <div style={{ padding: '16px', borderBottom: `1px solid ${adminTheme.border}`, fontWeight: 'bold', fontSize: '14px', color: '#111', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} color={adminTheme.accent} /> 어드민 시스템 안내
                </div>
                <div style={{ padding: '24px 16px', fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>좌측 <strong>[회원 및 파트너 정책]</strong> 메뉴에서 회원별 상세 검색, 차단, 및 권한 제어를 수행할 수 있습니다.</li>
                        <li><strong>[사마캐시 관리]</strong> 탭에서 관리자 직권으로 고객에게 캐시를 지급하거나 회수할 수 있습니다.</li>
                        <li>본 대시보드의 실시간 차트 및 스토어 정산 그래프는 차기 마일스톤(V4)에서 업데이트될 예정입니다.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}