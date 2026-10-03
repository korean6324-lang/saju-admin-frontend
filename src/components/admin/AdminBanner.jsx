// src/components/admin/AdminBanner.jsx
import React, { useState, useRef } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    UploadCloud, Save, Trash2, GripVertical, CheckCircle2, 
    Clock, AlertCircle, Image as ImageIcon, Link2, CalendarDays, 
    Users, Plus, Eye, EyeOff, LayoutTemplate
} from 'lucide-react';

export default function AdminBanner() {
    const queryClient = useQueryClient();

    // 폼 상태
    const [title, setTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [targetRole, setTargetRole] = useState('all');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // D&D 상태
    const dragItem = useRef();
    const dragOverItem = useRef();

    // ==========================================================
    // 1. 데이터 페칭
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
    // 2. 배너 업로드 및 저장
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
                image_url: publicUrlData.publicUrl,
                sort_order: newSortOrder,
                is_active: true
            }]);

            if (dbError) throw dbError;

            alert("✅ 배너가 성공적으로 등록되었습니다.");
            setTitle(''); setLinkUrl(''); setStartDate(''); setEndDate(''); setTargetRole('all');
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
    // 3. Native Drag & Drop 정렬
    // ==========================================================
    const handleDragStart = (e, index) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = "move";
        e.target.style.opacity = '0.5';
    };

    const handleDragEnter = (e, index) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = async (e) => {
        e.target.style.opacity = '1';
        if (dragItem.current === dragOverItem.current) return;

        const newBanners = [...banners];
        const draggedItemContent = newBanners.splice(dragItem.current, 1)[0];
        newBanners.splice(dragOverItem.current, 0, draggedItemContent);
        
        const updatedBanners = newBanners.map((banner, index) => ({
            id: banner.id,
            sort_order: index
        }));

        queryClient.setQueryData(['adminBanners'], newBanners.map((b, i) => ({ ...b, sort_order: i })));

        try {
            const { error } = await supabase.from('banners').upsert(updatedBanners);
            if (error) throw error;
        } catch (error) {
            alert("❌ 정렬 순서 저장 실패");
            queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
        }
        dragItem.current = null; dragOverItem.current = null;
    };

    // ==========================================================
    // 4. 상태 및 삭제 제어
    // ==========================================================
    const handleDelete = async (id, url) => {
        if (!window.confirm("배너를 삭제하시겠습니까? (원본 이미지도 영구 삭제됩니다)")) return;
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
        // 낙관적 업데이트
        const previousBanners = queryClient.getQueryData(['adminBanners']);
        queryClient.setQueryData(['adminBanners'], old => 
            old.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b)
        );

        try {
            const { error } = await supabase.from('banners').update({ is_active: !currentStatus }).eq('id', id);
            if (error) throw error;
        } catch (error) {
            queryClient.setQueryData(['adminBanners'], previousBanners);
            alert("❌ 상태 변경 실패");
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
                .ios-page-desc {
                    font-size: 14px; color: #8E8E93; margin: 0 0 24px 0; font-weight: 500;
                }

                /* 리스트 그룹 (Inset Grouped) */
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

                /* 아이콘 박스 */
                .ios-icon-box {
                    width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #FFF; flex-shrink: 0; margin-right: 12px;
                }

                /* 폼 컨트롤 */
                .ios-label-wrap { display: flex; align-items: center; flex: 1; }
                .ios-label { font-size: 16px; font-weight: 500; color: #1C1C1E; letter-spacing: -0.3px; }
                
                .ios-input {
                    flex: 2; border: none; outline: none; background: transparent; text-align: right;
                    font-size: 16px; color: #1C1C1E; font-weight: 500; width: 100%; min-width: 0;
                }
                .ios-input::placeholder { color: #C7C7CC; }
                .ios-select {
                    border: none; outline: none; background: transparent; font-size: 16px; color: #1C1C1E; text-align: right; font-weight: 500; direction: rtl; appearance: none;
                }

                /* 이미지 썸네일 업로드 영역 */
                .ios-upload-trigger {
                    display: flex; align-items: center; gap: 8px; color: #007AFF; font-weight: 600; font-size: 15px; cursor: pointer;
                }
                .ios-preview-box {
                    height: 44px; width: 130px; border-radius: 8px; background-color: #F2F2F7; border: 0.5px solid #C6C6C8; overflow: hidden; display: flex; align-items: center; justify-content: center;
                }

                /* 메인 버튼 */
                .ios-primary-btn {
                    width: 100%; background-color: #007AFF; color: #FFFFFF; font-size: 16px; font-weight: 600;
                    padding: 14px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: transform 0.2s;
                }
                .ios-primary-btn:active:not(:disabled) { transform: scale(0.98); }
                .ios-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                /* 드래그 앤 드롭 리스트 아이템 */
                .ios-banner-card {
                    display: flex; align-items: stretch; background: #FFFFFF; padding: 16px; border-bottom: 0.5px solid #E5E5EA; transition: background-color 0.2s;
                }
                .ios-banner-card:last-child { border-bottom: none; }
                .drag-handle {
                    display: flex; align-items: center; justify-content: center; padding-right: 16px; color: #C7C7CC; cursor: grab;
                }
                .drag-handle:active { cursor: grabbing; }

                /* 토글 스위치 */
                .ios-toggle {
                    width: 51px; height: 31px; background-color: #E9E9EA; border-radius: 31px; position: relative; cursor: pointer; transition: background-color 0.3s ease; flex-shrink: 0;
                }
                .ios-toggle.active { background-color: #34C759; }
                .ios-toggle-knob {
                    width: 27px; height: 27px; background-color: #FFFFFF; border-radius: 50%; position: absolute; top: 2px; left: 2px; box-shadow: 0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06); transition: transform 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2);
                }
                .ios-toggle.active .ios-toggle-knob { transform: translateX(20px); }

                .ios-delete-btn {
                    background: #FFE5E5; color: #FF3B30; border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;
                }
            `}} />

            <div>
                <h1 className="ios-page-title">배너 관리</h1>
                <p className="ios-page-desc">새로운 배너를 추가하고 앱 내 노출 순서를 제어합니다.</p>
            </div>

            {/* =======================================
                1. 신규 배너 등록 폼 (iOS Inset Grouped)
            ======================================= */}
            <div className="ios-group-title"><Plus size={16} /> 신규 배너 등록</div>
            <div className="ios-list-group">
                {/* 이미지 등록 */}
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

                {/* 관리용 제목 */}
                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#FF9500' }}><LayoutTemplate size={16} /></div>
                        <span className="ios-label">타이틀</span>
                    </div>
                    <input type="text" className="ios-input" placeholder="예: 2026 신년 이벤트" value={title} onChange={e=>setTitle(e.target.value)} />
                </div>

                {/* 연결 링크 */}
                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#34C759' }}><Link2 size={16} /></div>
                        <span className="ios-label">이동 링크</span>
                    </div>
                    <input type="text" className="ios-input" placeholder="https:// (선택사항)" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} />
                </div>

                {/* 예약 스케줄 */}
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

                {/* 타겟 권한 */}
                <div className="ios-list-row">
                    <div className="ios-label-wrap">
                        <div className="ios-icon-box" style={{ background: '#AF52DE' }}><Users size={16} /></div>
                        <span className="ios-label">노출 대상</span>
                    </div>
                    <select className="ios-select" value={targetRole} onChange={e=>setTargetRole(e.target.value)}>
                        <option value="all">전체 사용자</option>
                        <option value="user">일반 회원 전용</option>
                        <option value="partner">파트너 전용</option>
                    </select>
                </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="ios-primary-btn">
                {isSaving ? <span className="lucide-spin"><UploadCloud size={18}/></span> : <Save size={18} />}
                {isSaving ? "업로드 중..." : "배너 생성"}
            </button>

            {/* =======================================
                2. 배너 관리 리스트 (Drag & Drop)
            ======================================= */}
            <div className="ios-group-title" style={{ marginTop: '40px' }}>
                <LayoutTemplate size={16} /> 활성 배너 리스트 ({banners.length})
            </div>
            
            <div className="ios-list-group">
                {isLoading ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#8E8E93', fontSize: '15px', fontWeight: '500' }}>데이터 로딩 중...</div>
                ) : banners.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#8E8E93', fontSize: '15px', fontWeight: '500' }}>등록된 배너가 없습니다.</div>
                ) : (
                    banners.map((banner, index) => {
                        const status = getBannerStatus(banner);
                        return (
                            <div 
                                key={banner.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                className="ios-banner-card"
                                style={{ opacity: banner.is_active ? 1 : 0.6 }}
                            >
                                {/* 드래그 햄버거 핸들 */}
                                <div className="drag-handle">
                                    <GripVertical size={20} />
                                </div>

                                {/* 메인 컨텐츠 영역 */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                                    
                                    {/* 썸네일 & 정보 */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div className="ios-preview-box" style={{ width: '100px', height: '40px', flexShrink: 0, backgroundColor: '#000' }}>
                                            <img src={banner.image_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1C1C1E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.3px', marginBottom: '2px' }}>
                                                {banner.title}
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: status.color, backgroundColor: status.bg, padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                    {status.icon} {status.text}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#8E8E93', fontWeight: '500' }}>
                                                    {banner.target_role === 'all' ? '전체' : banner.target_role === 'user' ? '회원' : '파트너'} 대상
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 액션 버튼 그룹 (하단) */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px dashed #E5E5EA', paddingTop: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1C1C1E' }}>앱 노출</span>
                                            <div className={`ios-toggle ${banner.is_active ? 'active' : ''}`} onClick={() => toggleActive(banner.id, banner.is_active)}>
                                                <div className="ios-toggle-knob"></div>
                                            </div>
                                        </div>
                                        <button className="ios-delete-btn" onClick={() => handleDelete(banner.id, banner.image_url)}>
                                            <Trash2 size={16} />
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