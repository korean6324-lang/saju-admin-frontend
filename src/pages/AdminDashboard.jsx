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
    const [openMenus, setOpenMenus] = useState({});

    const toggleMenu = (id) => {
        setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // 🌟 iOS 스타일 테마
    const adminTheme = {
        bg: '#F2F2F7', panelBg: '#FFFFFF', border: '#E5E5EA', textBright: '#1C1C1E',     
        text: '#3A3A3C', textMuted: '#8E8E93', primary: '#007AFF', accent: '#007AFF',         
        danger: '#FF3B30', good: '#34C759', sidebarBg: '#F2F2F7', sidebarText: '#1C1C1E',    
        sidebarActive: '#FFFFFF', tableHeaderBg: '#F9F9FB', tableRowBorder: '#E5E5EA', 
        shadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
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

    if (isChecking) return (
        <div style={{ minHeight: '100vh', background: adminTheme.bg, color: adminTheme.textBright, display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '600' }}>
            <span className="lucide-spin" style={{ marginRight: '8px' }}><Settings size={20} color="#007AFF"/></span> 어드민 시스템 접근 권한 확인 중...
        </div>
    );

    // 🚨 해결됨: 배열 내부에 JSX 태그 대신 컴포넌트 참조(Reference)만 저장하여 에디터 파싱 오류 방지
    const menuItems = [
        { category: '서비스 관리', hideCategoryTitle: false, items: [
            { id: 'overview', icon: BarChart3, label: '대시보드 통계' },
            { id: 'user_manage', icon: UserPlus, label: '사용자관리' },
            { 
                id: 'member_manage', 
                icon: Users, 
                label: '회원관리',
                subItems: [
                    { id: 'partners_users', label: '1. 전체회원' },
                    { id: 'partners_apps', label: '2. 입점 심사 대기열' },
                    { id: 'partners_list', label: '3. 승인된 파트너' }
                ]
            }
        ]},
        { category: '정산관리', hideCategoryTitle: true, items: [
            { 
                id: 'settlement_manage', 
                icon: Wallet, 
                label: '정산관리', 
                subItems: [
                    { id: 'cash', label: '1. 정산 및 포인트' } 
                ]
            }
        ]},
        { category: '콘텐츠 관리', hideCategoryTitle: true, items: [
            { 
                id: 'content_manage', 
                icon: Map, 
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
                icon: Megaphone, 
                label: '운영/마케팅 관리', 
                subItems: [
                    { id: 'notice', label: '1. 공지사항 및 알림톡' },
                    { id: 'banner', label: '2. 메인 배너 스케줄링' }
                ]
            }
        ]},
        { category: '환경설정', hideCategoryTitle: true, items: [
            { 
                id: 'setting_manage', 
                icon: Settings, 
                label: '환경설정', 
                subItems: [
                    { id: 'site_settings', label: '1. 사이트 관리 (기본/정책)' }, 
                    { id: 'account', label: '2. 계정관리' }
                ]
            }
        ]}
    ];

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
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: adminTheme.bg, color: adminTheme.text, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif' }}>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-sidebar-scroll::-webkit-scrollbar { display: none; }
                
                .ios-menu-item {
                    padding: 10px 12px; margin: 2px 12px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: space-between;
                    cursor: pointer; transition: all 0.2s cubic-bezier(0.2, 0.85, 0.32, 1.2);
                    font-size: 15px; font-weight: 500; color: #1C1C1E;
                    border: 1px solid transparent;
                }
                .ios-menu-item:hover { background-color: rgba(0,0,0,0.04); }
                .ios-menu-item:active { transform: scale(0.98); }
                .ios-menu-item.active {
                    background-color: #FFFFFF; color: #007AFF; font-weight: 600;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 0.5px solid #E5E5EA;
                }
                
                .ios-sub-container {
                    overflow: hidden; animation: slideDown 0.2s ease-out forwards;
                }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                
                .ios-sub-item {
                    padding: 8px 12px 8px 42px; margin: 2px 12px; border-radius: 8px;
                    font-size: 14px; font-weight: 500; color: #8E8E93;
                    cursor: pointer; transition: all 0.2s;
                }
                .ios-sub-item:hover { color: #1C1C1E; background-color: rgba(0,0,0,0.03); }
                .ios-sub-item:active { transform: scale(0.98); }
                .ios-sub-item.active {
                    color: #007AFF; font-weight: 600; background-color: #E5F0FF;
                }

                .ios-glass-header {
                    background-color: rgba(242, 242, 247, 0.85);
                    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border-bottom: 0.5px solid #C6C6C8;
                }
                
                .ios-action-btn {
                    background: none; border: none; display: flex; align-items: center; gap: 6px;
                    font-size: 14px; font-weight: 600; cursor: pointer; padding: 6px 10px;
                    border-radius: 8px; transition: background-color 0.2s;
                }
                .ios-action-btn:hover { background-color: rgba(0,0,0,0.05); }
                .ios-action-btn:active { transform: scale(0.96); }

                .lucide-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />

            {/* 사이드바 (iPadOS Style) */}
            <aside style={{ width: '260px', flexShrink: 0, backgroundColor: adminTheme.sidebarBg, borderRight: '0.5px solid #C6C6C8', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', flexShrink: 0 }}>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1C1C1E', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sliders size={20} color="#007AFF" /> 
                        <span><span style={{ color: '#007AFF' }}>FATE</span> MASTER</span>
                    </h1>
                </div>

                <div className="ios-sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 0 32px 0' }}>
                    {menuItems.map((group, idx) => (
                        <div key={idx} style={{ marginBottom: '20px' }}>
                            {!group.hideCategoryTitle && (
                                <div style={{ padding: '0 24px', fontSize: '12px', color: '#8E8E93', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.3px' }}>
                                    {group.category}
                                </div>
                            )}
                            {group.items.map(menu => {
                                const isActive = activeTab === menu.id || (menu.subItems && menu.subItems.some(s => s.id === activeTab));
                                const IconComponent = menu.icon; // 🚨 동적 렌더링을 위한 컴포넌트 할당
                                
                                return (
                                    <div key={menu.id}>
                                        <div 
                                            className={`ios-menu-item ${isActive && !menu.subItems ? 'active' : ''}`}
                                            onClick={() => {
                                                if (menu.subItems) toggleMenu(menu.id);
                                                else setActiveTab(menu.id);
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {/* 🚨 태그 형태로 렌더링 */}
                                                <IconComponent size={18} color={isActive ? '#007AFF' : '#8E8E93'} />
                                                {menu.label}
                                            </div>
                                            {menu.subItems && (
                                                <ChevronRight size={16} style={{ transition: 'transform 0.25s cubic-bezier(0.2, 0.85, 0.32, 1.2)', transform: openMenus[menu.id] ? 'rotate(90deg)' : 'rotate(0deg)', color: '#C7C7CC' }} />
                                            )}
                                        </div>
                                        
                                        {menu.subItems && openMenus[menu.id] && (
                                            <div className="ios-sub-container">
                                                {menu.subItems.map(sub => (
                                                    <div 
                                                        key={sub.id}
                                                        className={`ios-sub-item ${activeTab === sub.id ? 'active' : ''}`}
                                                        onClick={() => setActiveTab(sub.id)}
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

            {/* 메인 콘텐츠 영역 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: 'calc(100% - 260px)' }}>
                {/* 상단 헤더 (Glassmorphism) */}
                <header className="ios-glass-header" style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: adminTheme.textMuted, fontWeight: '600' }}>
                        {breadcrumbText.split(' > ').map((text, idx, arr) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && <ChevronRight size={14} color="#C7C7CC" />}
                                <span style={{ color: idx === arr.length - 1 ? adminTheme.textBright : adminTheme.textMuted }}>{text}</span>
                            </React.Fragment>
                        ))}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="ios-action-btn" style={{ color: '#1C1C1E' }}>
                            <Settings size={16} /> 설정
                        </button>
                        <div style={{ width: '1px', height: '14px', backgroundColor: '#C6C6C8', margin: '0 8px' }}></div>
                        <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="ios-action-btn" style={{ color: '#FF3B30' }}>
                            <LogOut size={16} /> 안전하게 로그아웃
                        </button>
                    </div>
                </header>

                {/* 대시보드 컴포넌트 렌더링 뷰포트 */}
                <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
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