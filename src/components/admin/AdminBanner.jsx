// src/components/admin/AdminBanner.jsx
import React, { useState, useRef } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    UploadCloud, Save, Trash2, GripVertical, CheckCircle2, 
    Clock, AlertCircle, Image as ImageIcon, Link2, CalendarDays, 
    Users, Plus, Eye, EyeOff, LayoutTemplate, FileText, Check
} from 'lucide-react';

// 🚨 업데이트: '홈페이지' 및 '관리자 페이지' 명시적 추가
const PAGES_LIST = [
    { id: 'all', name: '전체 (모든 페이지)' },
    { id: 'home', name: '홈페이지' }, // 👈 추가된 부분
    { id: 'saju', name: '사주' },
    { id: 'gunghap', name: '궁합' },
    { id: 'wedding', name: '혼택일' },
    { id: 'ideal', name: '맞춤인연' },
    { id: 'unse', name: '오늘의 운세' },
    { id: 'naming', name: '이름 작명' },
    { id: 'myeongdang', name: '천하대명당' },
    { id: 'salbang', name: '이사/건축' },
    { id: 'sasang', name: '사상체질' },
    { id: 'tarot', name: '타로상담' },
    { id: 'meditation', name: '명상' },
    { id: 'dictionary', name: '사전' },
    { id: 'manseryeok', name: '만세력 캘린더' },
    { id: 'mypage', name: '마이페이지' },
    { id: 'admin', name: '관리자 페이지 (Admin)' }
];

export default function AdminBanner() {
    const queryClient = useQueryClient();

    // 폼 상태
    const [title, setTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [targetRole, setTargetRole] = useState('all');
    const [targetPages, setTargetPages] = useState(['all']);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const dragItem = useRef();
    const dragOverItem = useRef();

    // ==========================================================
    // 1. 페이지 다중 선택 토글 로직
    // ==========================================================
    const togglePage = (pageId) => {
        if (pageId === 'all') {
            setTargetPages(['all']);
        } else {
            let newPages = targetPages.filter(p => p !== 'all');
            if (newPages.includes(pageId)) {
                newPages = newPages.filter(p => p !== pageId);
            } else {
                newPages.push(pageId);
            }
            if (newPages.length === 0) newPages = ['all'];
            setTargetPages(newPages);
        }
    };

    // ==========================================================
    // 2. 데이터 페칭
    // ==========================================================
    const { data: banners = [], isLoading } = useQuery({
        queryKey: ['adminBanners'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('banners')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // ==========================================================
    // 3. 배너 업로드 및 저장
    // ==========================================================
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        if (!title || !selectedFile) return alert("제목과 배너 이미지는 필수 입력 항목입니다.");
        setIsSaving(true);
        let uploadedFilePath = '';

        try {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            uploadedFilePath = fileName;

            const { error: uploadError } = await supabase.storage.from('banners').upload(fileName, selectedFile);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('banners').getPublicUrl(fileName);
            const newSortOrder = banners.length > 0 ? Math.min(...banners.map(b => b.sort_order)) - 1 : 0;

            const { error: dbError } = await supabase.from('banners').insert([{
                title,
                link_url: linkUrl,
                start_date: startDate ? new Date(startDate).toISOString() : null,
                end_date: endDate ? new Date(endDate).toISOString() : null,
                target_role: targetRole,
                target_page: targetPages.join(','),
                image_url: publicUrlData.publicUrl,
                sort_order: newSortOrder,
                is_active: true
            }]);

            if (dbError) throw dbError;

            alert("✅ 배너가 성공적으로 등록되었습니다.");
            setTitle(''); setLinkUrl(''); setStartDate(''); setEndDate(''); 
            setTargetRole('all'); setTargetPages(['all']);
            setSelectedFile(null); setPreviewUrl('');
            
            queryClient.invalidateQueries({ queryKey: ['adminBanners'] });

        } catch (error) {
            console.error("배너 등록 오류:", error);
            if (uploadedFilePath) await supabase.storage.from('banners').remove([uploadedFilePath]); 
            alert("❌ 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================================
    // 4. Native Drag & Drop 정렬
    // ==========================================================
    const handleDragStart = (e, index) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = "move";
        e.target.style.opacity = '0.5';
    };

    const handleDragEnter = (e, index) => { dragOverItem.current = index; };

    const handleDragEnd = async (e) => {
        e.target.style.opacity = '1';
        if (dragItem.current === dragOverItem.current) return;

        const newBanners = [...banners];
        const draggedItemContent = newBanners.splice(dragItem.current, 1)[0];
        newBanners.splice(dragOverItem.current, 0, draggedItemContent);
        
        const updatedBanners = newBanners.map((banner, index) => ({ id: banner.id, sort_order: index }));
        queryClient.setQueryData(['adminBanners'], newBanners.map((b, i) => ({ ...b, sort_order: i })));

        try {
            const { error } = await supabase.from('banners').upsert(updatedBanners);
            if (error) throw error;
        } catch (error) {
            queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
        }
        dragItem.current = null; dragOverItem.current = null;
    };

    // ==========================================================
    // 5. 상태 및 삭제 제어
    // ==========================================================
    const handleDelete = async (id, url) => {
        if (!window.confirm("이 배너를 완전히 삭제하시겠습니까? (복구 불가)")) return;
        try {
            const urlParts = url.split('/banners/');
            if (urlParts.length === 2) {
                await supabase.storage.from('banners').remove([decodeURIComponent(urlParts[1])]);
            }
            await supabase.from('banners').delete().eq('id', id);
            queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
        } catch (error) { console.error("삭제 실패:", error); }
    };

    const toggleActive = async (id, currentStatus) => {
        const previousBanners = queryClient.getQueryData(['adminBanners']);
        queryClient.setQueryData(['adminBanners'], old => old.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));
        try {
            const { error } = await supabase.from('banners').update({ is_active: !currentStatus }).eq('id', id);
            if (error) throw error;
        } catch (error) {
            queryClient.setQueryData(['adminBanners'], previousBanners);
        }
    };

    const getBannerStatus = (banner) => {
        if (!banner.is_active) return { text: '숨김', color: '#8E8E93', bg: '#F2F2F7', icon: <EyeOff size={14}/> };
        const now = new Date().getTime();
        const start = banner.start_date ? new Date(banner.start_date).getTime() : 0;
        const end = banner.end_date ? new Date(banner.end_date).getTime() : Infinity;

        if (now < start) return { text: '예약됨', color: '#D97706', bg: '#FFF5E5', icon: <Clock size={14}/> };
        if (now > end) return { text: '만료됨', color: '#FF3B30', bg: '#FFE5E5', icon: <AlertCircle size={14}/> };
        return { text: '노출 중', color: '#34C759', bg: '#E5FBEB', icon: <Eye size={14}/> };
    };

    const getPageNamesDisplay = (targetPageStr) => {
        if (!targetPageStr || targetPageStr === 'all') return '전체 페이지';
        const pages = targetPageStr.split(',');
        const names = pages.map(p => PAGES_LIST.find(item => item.id === p)?.name || p);
        if (names.length > 2) return `${names[0]}, ${names[1]} 외 ${names.length - 2}곳`;
        return names.join(', ');
    };

    return (
        <div className="ios-admin-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-admin-wrap {
                    width: 100%; box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif;
                    background-color: #F2F2F7;
                    min-height: 100vh; padding: 24px; padding-bottom: 100px;
                }

                .ios-page-title {
                    font-size: 28px; font-weight: 800; color: #1C1C1E;
                    margin: 0 0 8px 0; letter-spacing: -0.5px;
                }
                .ios-page-desc { font-size: 14px; color: #8E8E93; margin: 0 0 24px 0; font-weight: 500; }

                .ios-group-title {
                    font-size: 13px; font-weight: 600; color: #8E8E93; text-transform: uppercase;
                    margin: 0 0 6px 16px; letter-spacing: -0.3px; display: flex; align-items: center; gap: 6px;
                }
                .ios-list-group {
                    background-color: #FFFFFF; border-radius: 12px; margin-bottom: 32px;
                    overflow: hidden; border: 0.5px solid #C6C6C8;
                }
                .ios-list-row {
                    display: flex; align-items: center; justify-content: space-between;
                    min-height: 48px; padding: 12px 16px; border-bottom: 0.5px solid #E5E5EA;
                }
                .ios-list-row:last-child { border-bottom: none; }

                .ios-icon-box {
                    width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #FFF; flex-shrink: 0; margin-right: 12px;
                }

                .ios-label-wrap { display: flex; align-items: center; flex: 1; }
                .ios-label { font-size: 16px; font-weight: 500; color: #1C1C1E; letter-spacing: -0.3px; }
                
                .ios-input {
                    flex: 2; border: none; outline: none; background: transparent; text-align: right;
                    font-size: 16px; color: #1C1C1E; font-weight: 500; width: 100%; min-width: 0;
                }
                .ios-input::placeholder { color: #C7C7CC; }

                .ios-upload-trigger {
                    display: flex; align-items: center; gap: 8px; color: #007AFF; font-weight: 600; font-size: 15px; cursor: pointer;
                }
                .ios-preview-box {
                    height: 44px; width: 130px; border-radius: 8px; background-color: #F2F2F7; border: 0.5px solid #C6C6C8; overflow: hidden; display: flex; align-items: center; justify-content: center;
                }

                .ios-page-grid {
                    display: flex; flex-wrap: wrap; gap: 8px; padding: 16px; background-color: #F9F9FB; border-top: 1px solid #E5E5EA;
                }
                .ios-page-chip {
                    padding: 8px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;
                    background-color: #FFFFFF; color: #8E8E93; border: 1px solid #E5E5EA;
                    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 4px;
                }
                .ios-page-chip:hover { border-color: #C7C7CC; }
                .ios-page-chip.active {
                    background-color: #007AFF; color: #FFFFFF; border-color: #007AFF;
                    box-shadow: 0 4px 12px rgba(0,122,255,0.25);
                }

                .ios-mini-segment {
                    display: flex; background-color: #F2F2F7; border-radius: 8px; padding: 2px;
                }
                .ios-mini-btn {
                    padding: 6px 12px; text-align: center; font-size: 14px; font-weight: 600;
                    color: #8E8E93; border-radius: 6px; cursor: pointer; transition: all 0.2s;
                }
                .ios-mini-btn.active {
                    background-color: #FFFFFF; color: #1C1C1E; box-shadow: 0 2px 4px rgba(0,0,0,0.06);
                }

                .ios-primary-btn {
                    width: 100%; background-color: #007AFF; color: #FFFFFF; font-size: 16px; font-weight: 600;
                    padding: 14px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: transform 0.2s;
                }
                .ios-primary-btn:active:not(:disabled) { transform: scale(0.98); }
                .ios-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .ios-banner-card {
                    display: flex; align-items: stretch; background: #FFFFFF; padding: 16px; border-bottom: 0.5px solid #E5E5EA; transition: background-color 0.2s;
                }
                .drag-handle { display: flex; align-items: center; justify-content: center; padding-right: 16px; color: #C7C7CC; cursor: grab; }
                .drag-handle:active { cursor: grabbing; }

                .ios-toggle {
                    width: 51px; height: 31px; background-color: #E9E9EA; border-radius: 31px; position: relative; cursor: pointer; transition: background-color 0.3s ease; flex-shrink: 0;
                }
                .ios-toggle.active { background-color: #34C759; }
                .ios-toggle-knob {
                    width: 27px; height: 27px; background-color: #FFFFFF; border-radius: 50%; position: absolute; top: 2px; left: 2px; box-shadow: 0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06); transition: transform 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2);
                }
                .ios-toggle.active .ios-toggle-knob { transform: translateX(20px); }

                .ios-delete-btn {
                    background: #FFE5E5; color: #FF3B30; border: none; border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer; font-size: 13px; font-weight: 700; transition: transform 0.2s;
                }
                .ios-delete-btn:active { transform: scale(0.95); }
            `}} />

            <div>
                <h1 className="ios-page-title">배너 관리</h1>
                <p className="ios-page-desc">새로운 배너를 추가하고 앱 내 노출 순서를 제어합니다.</p>
            </div>

            <div className="ios-group-title"><Plus size={16} /> 신규 배너 등록</div>
            <div className="ios-list-group">
                
                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#5856D6' }}><ImageIcon size={16} /></div>
                        <span className="ios-label">배너 이미지</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {previewUrl && (
                            <div className="ios-preview-box">
                                <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        )}
                        <label className="ios-upload-trigger">
                            <UploadCloud size={18} /> {previewUrl ? '변경' : '업로드'}
                            <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#FF9500' }}><LayoutTemplate size={16} /></div>
                        <span className="ios-label">타이틀</span>
                    </div>
                    <input type="text" className="ios-input" placeholder="예: 2026 신년 이벤트" value={title} onChange={e=>setTitle(e.target.value)} />
                </div>

                <div className="ios-list-row" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
                        <div className="ios-label-wrap">
                            <div className="ios-icon-box" style={{ background: '#00C7AE' }}><FileText size={16} /></div>
                            <span className="ios-label">노출 대상 페이지 (다중 선택 가능)</span>
                        </div>
                    </div>
                    <div className="ios-page-grid">
                        {PAGES_LIST.map(p => {
                            const isActive = targetPages.includes(p.id);
                            return (
                                <div 
                                    key={p.id} 
                                    className={`ios-page-chip ${isActive ? 'active' : ''}`}
                                    onClick={() => togglePage(p.id)}
                                >
                                    {isActive && <Check size={14} strokeWidth={3} />}
                                    {p.name}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#34C759' }}><Link2 size={16} /></div>
                        <span className="ios-label">이동 링크</span>
                    </div>
                    <input type="text" className="ios-input" placeholder="https:// (선택사항)" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} />
                </div>

                <div className="ios-list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '16px' }}>
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#FF2D55' }}><CalendarDays size={16} /></div>
                        <span className="ios-label">노출 기간 (선택)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="datetime-local" className="ios-input" style={{ backgroundColor: '#F2F2F7', padding: '8px 12px', borderRadius: '8px', textAlign: 'left' }} value={startDate} onChange={e=>setStartDate(e.target.value)} />
                        <span style={{ color: '#8E8E93', fontWeight: '600' }}>~</span>
                        <input type="datetime-local" className="ios-input" style={{ backgroundColor: '#F2F2F7', padding: '8px 12px', borderRadius: '8px', textAlign: 'left' }} value={endDate} onChange={e=>setEndDate(e.target.value)} />
                    </div>
                </div>

                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#AF52DE' }}><Users size={16} /></div>
                        <span className="ios-label">노출 대상 권한</span>
                    </div>
                    <div className="ios-mini-segment">
                        <div className={`ios-mini-btn ${targetRole === 'all' ? 'active' : ''}`} onClick={() => setTargetRole('all')}>전체 사용자</div>
                        <div className={`ios-mini-btn ${targetRole === 'user' ? 'active' : ''}`} onClick={() => setTargetRole('user')}>일반 회원</div>
                        <div className={`ios-mini-btn ${targetRole === 'partner' ? 'active' : ''}`} onClick={() => setTargetRole('partner')}>파트너</div>
                    </div>
                </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="ios-primary-btn">
                {isSaving ? <span className="lucide-spin"><UploadCloud size={18}/></span> : <Save size={18} />}
                {isSaving ? "업로드 중..." : "배너 생성"}
            </button>

            <div className="ios-group-title" style={{ marginTop: '40px' }}>
                <LayoutTemplate size={16} /> 활성 배너 리스트 ({banners.length})
            </div>
            
            <div className="ios-list-group">
                {isLoading ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#8E8E93', fontSize: '15px' }}>데이터 로딩 중...</div>
                ) : banners.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#8E8E93', fontSize: '15px' }}>등록된 배너가 없습니다.</div>
                ) : (
                    banners.map((banner, index) => {
                        const status = getBannerStatus(banner);
                        return (
                            <div 
                                key={banner.id} draggable onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()}
                                className="ios-banner-card" style={{ opacity: banner.is_active ? 1 : 0.6 }}
                            >
                                <div className="drag-handle"><GripVertical size={20} /></div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div className="ios-preview-box" style={{ width: '100px', height: '40px', flexShrink: 0, backgroundColor: '#000' }}>
                                            <img src={banner.image_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1C1C1E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                                                {banner.title}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: status.color, backgroundColor: status.bg, padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                    {status.icon} {status.text}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '600', backgroundColor: '#F2F2F7', padding: '2px 6px', borderRadius: '4px' }}>
                                                    📍 {getPageNamesDisplay(banner.target_page)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px dashed #E5E5EA', paddingTop: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className={`ios-toggle ${banner.is_active ? 'active' : ''}`} onClick={() => toggleActive(banner.id, banner.is_active)}>
                                                <div className="ios-toggle-knob"></div>
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: '700', color: banner.is_active ? '#34C759' : '#8E8E93' }}>
                                                {banner.is_active ? '✅ 노출 중' : '❌ 비노출 (숨김)'}
                                            </span>
                                        </div>
                                        <button className="ios-delete-btn" onClick={() => handleDelete(banner.id, banner.image_url)}>
                                            <Trash2 size={16} /> 삭제
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#8E8E93', fontWeight: '500' }}>
                목록의 우측 햄버거 아이콘(⋮⋮)을 길게 눌러 드래그하면 순서가 변경됩니다.
            </div>
        </div>
    );
}