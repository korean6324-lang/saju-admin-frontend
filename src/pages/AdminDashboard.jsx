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
import AdminDeposit from '../components/admin/AdminDeposit'; // 🚨 신규 추가: 충전 승인 관리 컴포넌트 임포트
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

    // 🌟 화사하고 밝은 모던 브라이트(Modern Bright) 테마
    const adminTheme = {
        bg: '#F8FAFC',            
        panelBg: '#FFFFFF',       
        border: '#E2E8F0',        
        textBright: '#0F172A',    
        text: '#334155',          
        textMuted: '#94A3B8',     
        primary: '#3B82F6',       
        accent: '#2563EB',        
        danger: '#EF4444', 
        good: '#10B981', 
        sidebarBg: '#FFFFFF',     
        sidebarText: '#475569',   
        sidebarActive: '#EFF6FF', 
        tableHeaderBg: '#F8FAFC', 
        tableRowBorder: '#F1F5F9', 
        shadow: '0 4px 20px rgba(0, 0, 0, 0.03)' 
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
            <span className="lucide-spin" style={{ marginRight: '8px' }}><Settings size={20} color={adminTheme.primary}/></span> 어드민 시스템 접근 권한 확인 중...
        </div>
    );

    // 🚨 불필요한 하위 메뉴 제거 및 정산관리에 '충전 승인 관리' 추가
    const menuItems = [
        { category: '서비스 관리', hideCategoryTitle: false, items: [
            { id: 'overview', icon: BarChart3, label: '대시보드 통계' },
            { id: 'user_manage', icon: UserPlus, label: '사용자관리' },
            { id: 'member_manage', icon: Users, label: '회원 및 권한 관리' } // 단일 메뉴로 통합
        ]},
        { category: '정산관리', hideCategoryTitle: true, items: [
            { 
                id: 'settlement_manage', 
                icon: Wallet, 
                label: '정산관리', 
                subItems: [
                    { id: 'cash', label: '1. 환전(출금) 정산' }, 
                    { id: 'deposit', label: '2. 충전(입금) 승인 관리' } // 🚨 신규 메뉴 추가됨
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
                
                /* 밝고 경쾌한 메뉴 스타일 */
                .ios-menu-item {
                    padding: 12px 14px; margin: 4px 16px; border-radius: 12px;
                    display: flex; align-items: center; justify-content: space-between;
                    cursor: pointer; transition: all 0.2s ease;
                    font-size: 15px; font-weight: 500; color: #475569;
                    background-color: transparent; border: 1px solid transparent;
                }
                .ios-menu-item:hover { background-color: #F8FAFC; color: #0F172A; }
                .ios-menu-item:active { transform: scale(0.98); }
                .ios-menu-item.active {
                    background-color: #EFF6FF; color: #2563EB; font-weight: 700;
                }
                
                .ios-sub-container {
                    overflow: hidden; animation: slideDown 0.25s cubic-bezier(0.2, 0.85, 0.32, 1.2) forwards;
                }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                
                .ios-sub-item {
                    padding: 10px 12px 10px 46px; margin: 2px 16px; border-radius: 10px;
                    font-size: 14px; font-weight: 500; color: #94A3B8;
                    cursor: pointer; transition: all 0.2s ease; position: relative;
                }
                .ios-sub-item:hover { color: #334155; background-color: #F8FAFC; }
                .ios-sub-item:active { transform: scale(0.98); }
                .ios-sub-item.active {
                    color: #2563EB; font-weight: 700; background-color: transparent;
                }
                .ios-sub-item.active::before {
                    content: ''; position: absolute; left: 24px; top: 50%; transform: translateY(-50%);
                    width: 6px; height: 6px; border-radius: 50%; background-color: #3B82F6;
                    box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
                }

                .ios-glass-header {
                    background-color: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                    border-bottom: 1px solid #E2E8F0;
                }
                
                .ios-action-btn {
                    background: #F8FAFC; border: 1px solid #E2E8F0; display: flex; align-items: center; gap: 6px;
                    font-size: 13px; font-weight: 700; cursor: pointer; padding: 8px 14px;
                    border-radius: 10px; transition: all 0.2s; color: #475569;
                }
                .ios-action-btn:hover { background-color: #F1F5F9; border-color: #CBD5E1; color: #0F172A; }
                .ios-action-btn:active { transform: scale(0.96); }
                .ios-action-btn.danger { color: #EF4444; background-color: #FEF2F2; border-color: #FECACA; }
                .ios-action-btn.danger:hover { background-color: #FEE2E2; color: #DC2626; }

                .lucide-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />

            {/* 사이드바 */}
            <aside style={{ width: '280px', flexShrink: 0, backgroundColor: adminTheme.sidebarBg, borderRight: `1px solid ${adminTheme.border}`, display: 'flex', flexDirection: 'column' }}>
                
                <div style={{ height: '72px', display: 'flex', alignItems: 'center', padding: '0 28px', flexShrink: 0, borderBottom: `1px solid ${adminTheme.border}` }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: adminTheme.textBright, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sliders size={18} color="#FFFFFF" strokeWidth={2.5} /> 
                        </div>
                        <span><span style={{ color: adminTheme.primary }}>FATE</span> MASTER</span>
                    </h1>
                </div>

                <div className="ios-sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 0 40px 0' }}>
                    {menuItems.map((group, idx) => (
                        <div key={idx} style={{ marginBottom: '24px' }}>
                            {!group.hideCategoryTitle && (
                                <div style={{ padding: '0 24px', fontSize: '12px', color: adminTheme.textMuted, fontWeight: '700', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                    {group.category}
                                </div>
                            )}
                            {group.items.map(menu => {
                                const isActive = activeTab === menu.id || (menu.subItems && menu.subItems.some(s => s.id === activeTab));
                                const IconComponent = menu.icon; 
                                
                                return (
                                    <div key={menu.id}>
                                        <div 
                                            className={`ios-menu-item ${isActive && !menu.subItems ? 'active' : ''}`}
                                            onClick={() => {
                                                if (menu.subItems) toggleMenu(menu.id);
                                                else setActiveTab(menu.id);
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <IconComponent size={20} color={isActive ? adminTheme.accent : adminTheme.textMuted} strokeWidth={isActive ? 2.5 : 2} />
                                                {menu.label}
                                            </div>
                                            {menu.subItems && (
                                                <ChevronRight size={18} style={{ transition: 'transform 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2)', transform: openMenus[menu.id] ? 'rotate(90deg)' : 'rotate(0deg)', color: '#CBD5E1' }} />
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: 'calc(100% - 280px)' }}>
                <header className="ios-glass-header" style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: adminTheme.textMuted, fontWeight: '600' }}>
                        {breadcrumbText.split(' > ').map((text, idx, arr) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && <ChevronRight size={16} color="#CBD5E1" />}
                                <span style={{ color: idx === arr.length - 1 ? adminTheme.textBright : adminTheme.textMuted, fontWeight: idx === arr.length - 1 ? '700' : '500' }}>{text}</span>
                            </React.Fragment>
                        ))}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="ios-action-btn">
                            <Settings size={16} /> 설정
                        </button>
                        <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="ios-action-btn danger">
                            <LogOut size={16} /> 안전하게 로그아웃
                        </button>
                    </div>
                </header>

                <main style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
                    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
                        {activeTab === 'overview' && <AdminOverview adminTheme={adminTheme} isDarkMode={false} />}
                        {activeTab === 'user_manage' && <AdminUserManage adminTheme={adminTheme} />}
                        
                        {/* 회원관리: 불필요한 하위탭 제거 후 직관적인 렌더링 */}
                        {activeTab === 'member_manage' && <AdminPartners adminTheme={adminTheme} defaultTab="users" />}
                        
                        {/* 🚨 정산관리 하위 */}
                        {activeTab === 'cash' && <AdminCash adminTheme={adminTheme} />}
                        {activeTab === 'deposit' && <AdminDeposit adminTheme={adminTheme} />} {/* 충전 승인 관리 컴포넌트 추가 */}

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