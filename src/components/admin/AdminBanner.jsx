// src/components/admin/AdminBanner.jsx
import React, { useState, useRef } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Save, Trash2, GripVertical, CheckCircle2, Clock, AlertCircle, Image as ImageIcon } from 'lucide-react';

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
            queryClient.invalidateQueries(['adminBanners']);

        } catch (error) {
            console.error("배너 등록 오류:", error);
            if (uploadedFilePath) await supabase.storage.from('banners').remove([uploadedFilePath]); 
            alert("❌ 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================================
    // 3. Native Drag & Drop 정렬 (낙관적 업데이트 반영)
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
            queryClient.invalidateQueries(['adminBanners']);
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
            queryClient.invalidateQueries(['adminBanners']);
        } catch (error) { console.error("삭제 실패:", error); }
    };

    const toggleActive = async (id, currentStatus) => {
        await supabase.from('banners').update({ is_active: !currentStatus }).eq('id', id);
        queryClient.invalidateQueries(['adminBanners']);
    };

    const getBannerStatus = (banner) => {
        if (!banner.is_active) return { text: '숨김처리', color: '#999', icon: <AlertCircle size={12}/> };
        const now = new Date().getTime();
        const start = banner.start_date ? new Date(banner.start_date).getTime() : 0;
        const end = banner.end_date ? new Date(banner.end_date).getTime() : Infinity;

        if (now < start) return { text: '예약 대기', color: '#d97706', icon: <Clock size={12}/> };
        if (now > end) return { text: '기간 만료', color: '#ef4444', icon: <AlertCircle size={12}/> };
        return { text: '정상 노출', color: '#059669', icon: <CheckCircle2 size={12}/> };
    };

    // ==========================================================
    // 🎨 엔터프라이즈 화이트 테마 스타일 (12~13px 고밀도)
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '24px' },
        
        formBox: { border: '2px solid #E5E7EB', display: 'flex', flexDirection: 'column', marginBottom: '16px', borderBottom: 'none' },
        formRow: { display: 'flex', borderBottom: '1px solid #E5E7EB' },
        formLabel: { width: '140px', backgroundColor: '#F9FAFB', padding: '10px 16px', fontWeight: 'bold', color: '#444', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', fontSize: '12px' },
        formContent: { flex: 1, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' },
        
        input: { padding: '4px 8px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', width: '100%', maxWidth: '350px' },
        select: { padding: '4px 8px', border: '1px solid #CCC', fontSize: '12px', outline: 'none' },
        
        submitBtn: { backgroundColor: '#0ea5e9', color: '#FFF', border: 'none', padding: '8px 30px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '2px' },
        
        // D&D 테이블형 리스트 디자인
        listHeader: { display: 'flex', backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '10px 0', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '12px' },
        listItem: { display: 'flex', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFF', alignItems: 'center', fontSize: '12px', color: '#555' },
        
        actionBtnBlue: { padding: '4px 8px', border: '1px solid #0ea5e9', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#0ea5e9' },
        actionBtnRed: { padding: '4px 8px', border: '1px solid #ef4444', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#ef4444' },
    };

    return (
        <div style={styles.container}>
            {/* 1. 상단 타이틀 */}
            <div>
                <h2 style={styles.headerTitle}>메인 배너 스케줄링</h2>
                <p style={styles.headerSub}>[운영 및 마케팅 &gt; 배너 관리] 신규 배너를 등록하고, 드래그 앤 드롭으로 노출 순서를 변경할 수 있습니다.</p>
            </div>

            {/* 2. 꽉 찬 표 형태의 등록 폼 (Whois 스타일) */}
            <div style={styles.formBox}>
                
                {/* 1열: 배너 이미지 & 제목 */}
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 배너 이미지 <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                    <div style={styles.formContent}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '120px', height: '40px', border: '1px solid #CCC', backgroundColor: '#F9FAFB', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#555', borderRadius: '2px' }}>
                            <UploadCloud size={14} style={{marginRight: '6px'}} /> 이미지 선택
                            <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                        </label>
                        {previewUrl && (
                            <img src={previewUrl} alt="preview" style={{ height: '40px', width: 'auto', border: '1px solid #E5E7EB', marginLeft: '10px' }} />
                        )}
                        <span style={{color: '#999', marginLeft: '8px'}}>(권장 해상도: 1200x400)</span>
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 관리용 제목 <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                    <div style={styles.formContent}>
                        <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="예: 2026 추석맞이 이벤트" style={styles.input} />
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 클릭 연결 링크</div>
                    <div style={styles.formContent}>
                        <input type="text" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="클릭 시 이동할 URL (생략 시 링크 없음)" style={styles.input} />
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 노출 스케줄링</div>
                    <div style={styles.formContent}>
                        <input type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)} style={styles.input} />
                        <span style={{margin: '0 8px', color: '#999'}}>~</span>
                        <input type="datetime-local" value={endDate} onChange={e=>setEndDate(e.target.value)} style={styles.input} />
                        <span style={{color: '#999', marginLeft: '8px'}}>(설정하지 않으면 즉시 무기한 노출됩니다)</span>
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 노출 타겟</div>
                    <div style={styles.formContent}>
                        <select value={targetRole} onChange={e=>setTargetRole(e.target.value)} style={styles.select}>
                            <option value="all">전체 (비로그인 포함)</option>
                            <option value="user">일반 회원 전용</option>
                            <option value="partner">스토어 파트너 전용</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 등록 버튼 */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <button onClick={handleSave} disabled={isSaving} style={{ ...styles.submitBtn, opacity: isSaving ? 0.6 : 1 }}>
                    <Save size={16} /> {isSaving ? "저장 중..." : "배너 등록하기"}
                </button>
            </div>

            {/* 3. 등록된 배너 리스트 (Flex Table 구조) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>
                    <ImageIcon size={14} style={{verticalAlign: 'middle', marginRight:'4px'}}/>
                    등록된 배너 리스트 <span style={{color: '#0ea5e9'}}>({banners.length})</span>
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>좌측 점선 아이콘(⋮⋮)을 드래그하여 순서를 변경하세요.</div>
            </div>

            <div style={{ width: '100%', borderBottom: '1px solid #CCC' }}>
                {/* 리스트 헤더 */}
                <div style={styles.listHeader}>
                    <div style={{ width: '40px' }}>순서</div>
                    <div style={{ width: '160px' }}>썸네일 이미지</div>
                    <div style={{ flex: 1, textAlign: 'left', paddingLeft: '16px' }}>배너 상세 정보</div>
                    <div style={{ width: '100px' }}>상태</div>
                    <div style={{ width: '120px' }}>관리</div>
                </div>

                {/* 리스트 아이템 */}
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '12px' }}>데이터를 불러오는 중입니다...</div>
                ) : banners.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '12px' }}>등록된 배너가 없습니다.</div>
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
                                style={{ ...styles.listItem, opacity: banner.is_active ? 1 : 0.6, cursor: 'grab' }}
                            >
                                {/* 드래그 핸들 */}
                                <div style={{ width: '40px', display: 'flex', justifyContent: 'center', color: '#CCC' }}>
                                    <GripVertical size={16} />
                                </div>

                                {/* 썸네일 */}
                                <div style={{ width: '160px', padding: '8px 0' }}>
                                    <div style={{ width: '140px', height: '46px', backgroundColor: '#000', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                                        <img src={banner.image_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                </div>

                                {/* 배너 정보 */}
                                <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#111' }}>{banner.title}</div>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#666' }}>
                                        <span style={{ border: '1px solid #CCC', padding: '1px 4px', borderRadius: '2px' }}>
                                            {banner.target_role === 'all' ? '전체' : banner.target_role === 'user' ? '회원' : '파트너'}
                                        </span>
                                        <span>{banner.start_date ? new Date(banner.start_date).toLocaleDateString() : '제한없음'} ~ {banner.end_date ? new Date(banner.end_date).toLocaleDateString() : '제한없음'}</span>
                                    </div>
                                </div>

                                {/* 상태 */}
                                <div style={{ width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: status.color, fontWeight: 'bold', fontSize: '12px' }}>
                                    {status.icon} {status.text}
                                </div>

                                {/* 관리 버튼 */}
                                <div style={{ width: '120px', display: 'flex', justifyContent: 'center', gap: '4px' }}>
                                    <button 
                                        onClick={() => toggleActive(banner.id, banner.is_active)} 
                                        style={banner.is_active ? styles.actionBtnBlue : styles.actionBtnRed}
                                    >
                                        {banner.is_active ? '숨기기' : '노출하기'}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(banner.id, banner.image_url)} 
                                        style={{...styles.actionBtn, color: '#ef4444'}}
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}