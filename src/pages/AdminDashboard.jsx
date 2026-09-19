// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { 
    Map, MonitorPlay, Image as ImageIcon, Users, BarChart3, 
    Bell, Wallet, LogOut, Settings, ChevronRight, UserPlus, Sliders,
    Search 
} from 'lucide-react'; 

import AdminOverview from '../components/admin/AdminOverview';
import AdminMyeongdang from '../components/admin/AdminMyeongdang';
import AdminMyeongdangRequests from '../components/admin/AdminMyeongdangRequests';
import AdminNotice from '../components/admin/AdminNotice';
import AdminCash from '../components/admin/AdminCash';
import AdminMedia from '../components/admin/AdminMedia';
import AdminBanner from '../components/admin/AdminBanner';
import AdminPartners from '../components/admin/AdminPartners';
import AdminAccount from '../components/admin/AdminAccount'; 
import AdminUserManage from '../components/admin/AdminUserManage'; 
import AdminSiteSettings from '../components/admin/AdminSiteSettings'; 

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [isChecking, setIsChecking] = useState(true);

    const adminTheme = {
        bg: '#F3F4F6',             
        panelBg: '#FFFFFF',        
        border: '#E5E7EB',         
        textBright: '#111827',     
        text: '#374151',           
        textMuted: '#6B7280',      
        primary: '#1E3A8A',        
        accent: '#2563EB',         
        danger: '#DC2626',         
        good: '#059669',           
        sidebarBg: '#1F2937',      
        sidebarText: '#D1D5DB',    
        sidebarActive: '#111827',  
        tableHeaderBg: '#F9FAFB',  
        tableRowBorder: '#F3F4F6', 
        shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    };

    useEffect(() => {
        const verifyAdmin = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    alert('로그인이 필요합니다.');
                    navigate('/');
                    return;
                }

                const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                
                if (error || !profile || profile.role !== 'admin') {
                    alert('관리자 접근 권한이 없습니다.');
                    navigate('/');
                    return;
                }
                
                setIsChecking(false);
            } catch (err) {
                console.error("Admin verification error:", err);
                alert('권한 확인 중 시스템 오류가 발생했습니다.');
                navigate('/');
            }
        };

        verifyAdmin();
    }, [navigate]);

    if (isChecking) {
        return <div style={{ minHeight: '100vh', background: adminTheme.bg, color: adminTheme.textBright, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>어드민 시스템 접근 권한 확인 중...</div>;
    }

    const menuItems = [
        { category: '서비스 관리', items: [
            { id: 'site_settings', icon: <Sliders size={18} />, label: '사이트 관리 (기본/정책)' }, 
            { id: 'account', icon: <Settings size={18} />, label: '계정관리' },
            { id: 'user_manage', icon: <UserPlus size={18} />, label: '사용자관리' },
            { id: 'overview', icon: <BarChart3 size={18} />, label: '대시보드 통계' },
            { id: 'partners', icon: <Users size={18} />, label: '회원 및 파트너 정책' },
            // 🚨 복구 완료: 메뉴판에 화복당캐시 관리 연결!
            { id: 'cash', icon: <Wallet size={18} />, label: '화복당캐시 관리' },
        ]},
        { category: '콘텐츠 관리', items: [
            { id: 'myeongdang', icon: <Map size={18} />, label: '천하대명당 DB' },
            // 🚨 복구 완료: 고객 감정 의뢰 관리 메뉴 유지!
            { id: 'myeongdang_requests', icon: <Search size={18} />, label: '고객 감정 의뢰 관리' },
            { id: 'media', icon: <MonitorPlay size={18} />, label: '명상 미디어' },
        ]},
        { category: '운영 및 마케팅', items: [
            { id: 'notice', icon: <Bell size={18} />, label: '공지사항 및 알림톡' },
            { id: 'banner', icon: <ImageIcon size={18} />, label: '메인 배너 스케줄링' },
        ]}
    ];

    const currentMenuLabel = menuItems.flatMap(c => c.items).find(m => m.id === activeTab)?.label || '';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: adminTheme.bg, color: adminTheme.text, fontFamily: '"Pretendard", sans-serif' }}>
            
            <aside style={{ width: '260px', flexShrink: 0, backgroundColor: adminTheme.sidebarBg, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${adminTheme.sidebarBg}` }}>
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', backgroundColor: '#111827', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#FFF', letterSpacing: '0.5px' }}>
                        <span style={{ color: adminTheme.accent }}>FATE MASTER</span> ADMIN
                    </h1>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
                    {menuItems.map((group, idx) => (
                        <div key={idx} style={{ marginBottom: '24px' }}>
                            <div style={{ padding: '0 24px', fontSize: '11px', color: '#9CA3AF', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {group.category}
                            </div>
                            {group.items.map(menu => (
                                <div 
                                    key={menu.id}
                                    onClick={() => setActiveTab(menu.id)}
                                    style={{ 
                                        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.1s',
                                        fontSize: '14px', fontWeight: activeTab === menu.id ? '700' : '500',
                                        backgroundColor: activeTab === menu.id ? adminTheme.sidebarActive : 'transparent',
                                        color: activeTab === menu.id ? '#FFF' : adminTheme.sidebarText,
                                        borderLeft: activeTab === menu.id ? `4px solid ${adminTheme.accent}` : '4px solid transparent'
                                    }}
                                >
                                    {React.cloneElement(menu.icon, { color: activeTab === menu.id ? adminTheme.accent : '#9CA3AF' })}
                                    {menu.label}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </aside>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: 'calc(100% - 260px)' }}>
                
                <header style={{ height: '60px', backgroundColor: adminTheme.panelBg, borderBottom: `1px solid ${adminTheme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: adminTheme.textMuted, fontWeight: '600' }}>
                        <span>환경설정</span> <ChevronRight size={14} /> <span style={{ color: adminTheme.textBright }}>{currentMenuLabel}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: adminTheme.text, cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                            <Settings size={16} /> 설정
                        </button>
                        <div style={{ width: '1px', height: '16px', backgroundColor: adminTheme.border }}></div>
                        <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: adminTheme.danger, cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                            <LogOut size={16} /> 안전하게 로그아웃
                        </button>
                    </div>
                </header>

                <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    <div style={{ width: '100%', maxWidth: '1600px' }}>
                        {activeTab === 'site_settings' && <AdminSiteSettings adminTheme={adminTheme} />} 
                        {activeTab === 'account' && <AdminAccount adminTheme={adminTheme} />}
                        {activeTab === 'user_manage' && <AdminUserManage adminTheme={adminTheme} />}
                        {activeTab === 'overview' && <AdminOverview adminTheme={adminTheme} isDarkMode={false} />}
                        {activeTab === 'partners' && <AdminPartners adminTheme={adminTheme} isDarkMode={false} />}
                        
                        {/* 🚨 복구 완료: 캐시 관리 화면 렌더링 연결! */}
                        {activeTab === 'cash' && <AdminCash adminTheme={adminTheme} />}

                        {activeTab === 'myeongdang' && <AdminMyeongdang adminTheme={adminTheme} />}
                        
                        {/* 🚨 복구 완료: 고객 감정 의뢰 화면 렌더링 연결! */}
                        {activeTab === 'myeongdang_requests' && <AdminMyeongdangRequests adminTheme={adminTheme} />}

                        {activeTab === 'notice' && <AdminNotice adminTheme={adminTheme} />}
                        {activeTab === 'media' && <AdminMedia adminTheme={adminTheme} />}
                        {activeTab === 'banner' && <AdminBanner adminTheme={adminTheme} />}
                    </div>
                </main>
            </div>
        </div>
    );
}