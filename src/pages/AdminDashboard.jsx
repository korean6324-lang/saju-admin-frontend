// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { 
    Map, MonitorPlay, Image as ImageIcon, Users, BarChart3, 
    Bell, Wallet, LogOut, Settings, ChevronRight, UserPlus, Sliders,
    Search, Layers, Megaphone
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
    
    // 어드민 진입 시 모든 아코디언 메뉴가 닫혀 있도록 빈 객체({})로 초기화
    const [openMenus, setOpenMenus] = useState({});

    const toggleMenu = (id) => {
        setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const adminTheme = {
        bg: '#F3F4F6', panelBg: '#FFFFFF', border: '#E5E7EB', textBright: '#111827',     
        text: '#374151', textMuted: '#6B7280', primary: '#1E3A8A', accent: '#2563EB',         
        danger: '#DC2626', good: '#059669', sidebarBg: '#1F2937', sidebarText: '#D1D5DB',    
        sidebarActive: '#111827', tableHeaderBg: '#F9FAFB', tableRowBorder: '#F3F4F6', 
        shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    };

    useEffect(() => {
        const verifyAdmin = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return navigate('/');
                const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                if (error || !profile || profile.role !== 'admin') return navigate('/');
                setIsChecking(false);
            } catch (err) { navigate('/'); }
        };
        verifyAdmin();
    }, [navigate]);

    if (isChecking) return <div style={{ minHeight: '100vh', background: adminTheme.bg, color: adminTheme.textBright, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>어드민 시스템 접근 권한 확인 중...</div>;

    // 🚀 [메뉴 구조 고도화 반영] 정산관리 & 환경설정 아코디언 추가
    const menuItems = [
        { category: '서비스 관리', hideCategoryTitle: false, items: [
            { id: 'overview', icon: <BarChart3 size={18} />, label: '대시보드 통계' },
            { id: 'user_manage', icon: <UserPlus size={18} />, label: '사용자관리' },
            { 
                id: 'member_manage', 
                icon: <Users size={18} />, 
                label: '회원관리',
                subItems: [
                    { id: 'partners_users', label: '1. 전체회원' },
                    { id: 'partners_apps', label: '2. 입점 심사 대기열' },
                    { id: 'partners_list', label: '3. 승인된 파트너' }
                ]
            }
        ]},
        // 🚀 신규: 정산관리 아코디언
        { category: '정산관리', hideCategoryTitle: true, items: [
            { 
                id: 'settlement_manage', 
                icon: <Wallet size={18} />, 
                label: '정산관리', 
                subItems: [
                    { id: 'cash', label: '1. 정산 및 포인트' } // 이름 변경 적용
                ]
            }
        ]},
        { category: '콘텐츠 관리', hideCategoryTitle: true, items: [
            { 
                id: 'content_manage', 
                icon: <Map size={18} />, 
                label: '콘텐츠 관리', 
                subItems: [
                    { id: 'myeongdang', label: '1. 천하대명당 DB' },
                    { id: 'myeongdang_requests', label: '2. 고객 감정 의뢰 관리' },
                    { id: 'media', label: '3. 명상 미디어' }
                ]
            }
        ]},
        { category: '운영 및 마케팅', hideCategoryTitle: true, items: [
            { 
                id: 'marketing_manage', 
                icon: <Megaphone size={18} />, 
                label: '운영/마케팅 관리', 
                subItems: [
                    { id: 'notice', label: '1. 공지사항 및 알림톡' },
                    { id: 'banner', label: '2. 메인 배너 스케줄링' }
                ]
            }
        ]},
        // 🚀 신규: 환경설정 아코디언
        { category: '환경설정', hideCategoryTitle: true, items: [
            { 
                id: 'setting_manage', 
                icon: <Settings size={18} />, 
                label: '환경설정', 
                subItems: [
                    { id: 'site_settings', label: '1. 사이트 관리 (기본/정책)' }, 
                    { id: 'account', label: '2. 계정관리' }
                ]
            }
        ]}
    ];

    // 빵판(Breadcrumb) 텍스트 동적 렌더링
    let breadcrumbText = '환경설정';
    for (const group of menuItems) {
        for (const item of group.items) {
            if (item.id === activeTab) {
                breadcrumbText = group.hideCategoryTitle ? item.label : `${group.category} > ${item.label}`;
            }
            if (item.subItems) {
                const sub = item.subItems.find(s => s.id === activeTab);
                if (sub) {
                    breadcrumbText = group.hideCategoryTitle 
                        ? `${item.label} > ${sub.label}` 
                        : `${group.category} > ${item.label} > ${sub.label}`;
                }
            }
        }
    }

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
                            {/* 카테고리 타이틀 시각적 중복 제거 */}
                            {!group.hideCategoryTitle && (
                                <div style={{ padding: '0 24px', fontSize: '11px', color: '#9CA3AF', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {group.category}
                                </div>
                            )}
                            {group.items.map(menu => {
                                const isActive = activeTab === menu.id || (menu.subItems && menu.subItems.some(s => s.id === activeTab));
                                
                                return (
                                    <div key={menu.id}>
                                        <div 
                                            onClick={() => {
                                                if (menu.subItems) toggleMenu(menu.id);
                                                else setActiveTab(menu.id);
                                            }}
                                            style={{ 
                                                padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.1s',
                                                fontSize: '14px', fontWeight: isActive ? '700' : '500',
                                                backgroundColor: isActive ? adminTheme.sidebarActive : 'transparent',
                                                color: isActive ? '#FFF' : adminTheme.sidebarText,
                                                borderLeft: isActive ? `4px solid ${adminTheme.accent}` : '4px solid transparent'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {React.cloneElement(menu.icon, { color: isActive ? adminTheme.accent : '#9CA3AF' })}
                                                {menu.label}
                                            </div>
                                            {menu.subItems && (
                                                <ChevronRight size={16} style={{ transition: 'transform 0.2s', transform: openMenus[menu.id] ? 'rotate(90deg)' : 'rotate(0deg)', color: '#9CA3AF' }} />
                                            )}
                                        </div>
                                        
                                        {menu.subItems && openMenus[menu.id] && (
                                            <div style={{ backgroundColor: '#111827', padding: '8px 0' }}>
                                                {menu.subItems.map(sub => (
                                                    <div 
                                                        key={sub.id}
                                                        onClick={() => setActiveTab(sub.id)}
                                                        style={{
                                                            padding: '10px 24px 10px 54px', fontSize: '13px', cursor: 'pointer',
                                                            color: activeTab === sub.id ? '#FFF' : '#9CA3AF',
                                                            fontWeight: activeTab === sub.id ? '700' : '500',
                                                            transition: 'color 0.2s'
                                                        }}
                                                    >
                                                        {sub.label}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </aside>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: 'calc(100% - 260px)' }}>
                <header style={{ height: '60px', backgroundColor: adminTheme.panelBg, borderBottom: `1px solid ${adminTheme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: adminTheme.textMuted, fontWeight: '600' }}>
                        {breadcrumbText.split(' > ').map((text, idx, arr) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && <ChevronRight size={14} />}
                                <span style={{ color: idx === arr.length - 1 ? adminTheme.textBright : adminTheme.textMuted }}>{text}</span>
                            </React.Fragment>
                        ))}
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
                        {activeTab === 'overview' && <AdminOverview adminTheme={adminTheme} isDarkMode={false} />}
                        {activeTab === 'user_manage' && <AdminUserManage adminTheme={adminTheme} />}
                        
                        {/* 회원관리 하위 */}
                        {activeTab === 'partners_users' && <AdminPartners adminTheme={adminTheme} defaultTab="users" />}
                        {activeTab === 'partners_apps' && <AdminPartners adminTheme={adminTheme} defaultTab="applications" />}
                        {activeTab === 'partners_list' && <AdminPartners adminTheme={adminTheme} defaultTab="partners" />}
                        
                        {/* 정산관리 하위 */}
                        {activeTab === 'cash' && <AdminCash adminTheme={adminTheme} />}

                        {/* 콘텐츠 관리 하위 */}
                        {activeTab === 'myeongdang' && <AdminMyeongdang adminTheme={adminTheme} />}
                        {activeTab === 'myeongdang_requests' && <AdminMyeongdangRequests adminTheme={adminTheme} />}
                        {activeTab === 'media' && <AdminMedia adminTheme={adminTheme} />}

                        {/* 운영/마케팅 관리 하위 */}
                        {activeTab === 'notice' && <AdminNotice adminTheme={adminTheme} />}
                        {activeTab === 'banner' && <AdminBanner adminTheme={adminTheme} />}

                        {/* 환경설정 하위 */}
                        {activeTab === 'site_settings' && <AdminSiteSettings adminTheme={adminTheme} />} 
                        {activeTab === 'account' && <AdminAccount adminTheme={adminTheme} />}
                    </div>
                </main>
            </div>
        </div>
    );
}