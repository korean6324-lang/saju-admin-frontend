// src/components/admin/AdminMyeongdang.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Map, UploadCloud, Save, X, Trash2, Eye, EyeOff, ImageIcon } from 'lucide-react';

export default function AdminMyeongdang({ session }) {
    const queryClient = useQueryClient();

    // 폼 상태
    const [mdTitle, setMdTitle] = useState('');
    const [mdLocation, setMdLocation] = useState('');
    const [mdDescription, setMdDescription] = useState('');
    const [mdFontSize, setMdFontSize] = useState('15px');
    const [mdFontFamily, setMdFontFamily] = useState('inherit');
    const [mdImages, setMdImages] = useState([]);
    const [mdImagePreviews, setMdImagePreviews] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // ==============================================================================
    // 🚀 1. React Query를 이용한 명당 데이터 페칭
    // ==============================================================================
    const { data: mdPosts = [], isLoading } = useQuery({
        queryKey: ['myeongdangPosts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('myeongdang_posts')
                .select('*')
                // 🚨 관리자 화면에서는 고정 여부와 상관없이 최신 등록순으로 나열하여 관리하기 편하게 합니다.
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const handleMdImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (mdImages.length + files.length > 5) return alert("최대 5장까지만 업로드 가능합니다.");
        setMdImages([...mdImages, ...files]);
        setMdImagePreviews([...mdImagePreviews, ...files.map(f => URL.createObjectURL(f))]);
    };

    const removeMdImage = (index) => {
        setMdImages(prev => prev.filter((_, i) => i !== index));
        setMdImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // ==============================================================================
    // 🚀 2. 병렬 업로드(Promise.all) 및 롤백(Rollback) 파이프라인
    // ==============================================================================
    const handleSave = async () => {
        if (!mdTitle || !mdDescription) return alert('제목과 설명을 입력해주세요.');
        if (mdImages.length === 0) return alert('최소 1장 이상의 사진을 업로드해주세요.');
        
        setIsSaving(true);
        let uploadedPaths = [];
        let uploadedUrls = [];

        try {
            // 병렬 업로드(Promise.all)
            const uploadPromises = mdImages.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('myeongdang_images').upload(fileName, file);
                if (uploadError) throw uploadError;
                
                const { data } = supabase.storage.from('myeongdang_images').getPublicUrl(fileName);
                return { path: fileName, url: data.publicUrl };
            });

            const uploadResults = await Promise.all(uploadPromises);
            uploadedPaths = uploadResults.map(r => r.path);
            uploadedUrls = uploadResults.map(r => r.url);

            // DB Insert (새 글 작성 시 기본적으로 is_pinned는 false로 들어갑니다)
            const { error: dbError } = await supabase.from('myeongdang_posts').insert([{
                user_id: session.user.id, 
                title: mdTitle, 
                location: mdLocation, 
                description: mdDescription,
                image_urls: uploadedUrls, 
                font_size: mdFontSize, 
                font_family: mdFontFamily, 
                is_visible: true,
                is_pinned: false
            }]);

            if (dbError) throw dbError;

            alert('✅ 천하대명당 포트폴리오가 성공적으로 등록되었습니다!');
            
            // 폼 초기화
            setMdTitle(''); setMdLocation(''); setMdDescription(''); setMdImages([]); setMdImagePreviews([]);
            queryClient.invalidateQueries(['myeongdangPosts']);

        } catch (error) {
            console.error("업로드 에러:", error);
            
            // 롤백
            if (uploadedPaths.length > 0) {
                console.warn("DB 저장 실패로 인해 클라우드에 업로드된 이미지를 강제 삭제(롤백)합니다.");
                await supabase.storage.from('myeongdang_images').remove(uploadedPaths);
            }
            alert(`❌ 저장 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleVis = async (id, currentVis) => {
        const { error } = await supabase.from('myeongdang_posts').update({ is_visible: !currentVis }).eq('id', id);
        if (!error) queryClient.invalidateQueries(['myeongdangPosts']);
        else alert('상태 변경에 실패했습니다.');
    };

    // 🚨 [신규 추가] 상위 고정(is_pinned) ON/OFF 토글 함수
    const togglePin = async (id, currentPin) => {
        const { error } = await supabase.from('myeongdang_posts').update({ is_pinned: !currentPin }).eq('id', id);
        if (!error) queryClient.invalidateQueries(['myeongdangPosts']);
        else alert('상위 고정 상태 변경에 실패했습니다.');
    };

    // ==============================================================================
    // 🚀 3. 하드 딜리트(Hard Delete) 파이프라인
    // ==============================================================================
    const delPost = async (id, imageUrls) => {
        if (!window.confirm("사례를 삭제하시겠습니까?\n🚨 스토리지에 저장된 원본 이미지 파일들도 영구 삭제됩니다.")) return;
        
        try {
            if (imageUrls && imageUrls.length > 0) {
                const filePaths = imageUrls.map(url => {
                    const parts = url.split('/myeongdang_images/');
                    return parts.length === 2 ? decodeURIComponent(parts[1]) : null;
                }).filter(Boolean);
                
                if (filePaths.length > 0) {
                    await supabase.storage.from('myeongdang_images').remove(filePaths);
                }
            }

            const { error: dbError } = await supabase.from('myeongdang_posts').delete().eq('id', id);
            if (dbError) throw dbError;

            queryClient.invalidateQueries(['myeongdangPosts']);
        } catch (error) {
            console.error("삭제 에러:", error);
            alert("❌ 삭제 중 오류가 발생했습니다.");
        }
    };

    // ==========================================================
    // 🎨 엔터프라이즈 화이트 테마 스타일 (12~13px 고밀도)
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '24px' },
        
        formBox: { border: '2px solid #E5E7EB', display: 'flex', flexDirection: 'column', marginBottom: '20px' },
        formRow: { display: 'flex', borderBottom: '1px solid #E5E7EB' },
        formLabel: { width: '140px', backgroundColor: '#F9FAFB', padding: '12px 16px', fontWeight: 'bold', color: '#444', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', fontSize: '12px', flexShrink: 0 },
        formContent: { flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', flexWrap: 'wrap' },
        
        input: { padding: '6px 10px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', width: '100%', maxWidth: '500px' },
        select: { padding: '6px 10px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', backgroundColor: '#FFF' },
        
        submitBtn: { backgroundColor: '#0ea5e9', color: '#FFF', border: 'none', padding: '10px 40px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
        
        // 테이블
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '12px' },
        tableCell: { padding: '8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
        
        actionBtnBlue: { padding: '4px 8px', border: '1px solid #0ea5e9', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#0ea5e9' },
        actionBtnRed: { padding: '4px 8px', border: '1px solid #ef4444', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#ef4444' },
        
        // 🚨 [신규 추가] 상위 고정 버튼용 스타일
        actionBtnOrange: { padding: '4px 8px', border: '1px solid #f97316', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#f97316', fontWeight: 'bold' },
        actionBtnGray: { padding: '4px 8px', border: '1px solid #d1d5db', backgroundColor: '#F9FAFB', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#9ca3af' }
    };

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 */}
            <div>
                <h2 style={styles.headerTitle}>천하대명당 DB 관리</h2>
                <p style={styles.headerSub}>[콘텐츠 관리 &gt; 천하대명당 DB] 풍수지리 명당 포트폴리오를 등록하고 전시 상태를 관리합니다.</p>
            </div>

            {/* 1. 꽉 찬 표 형태의 등록 폼 (Whois 스타일) */}
            <div style={styles.formBox}>
                
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 사례 제목 <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                    <div style={styles.formContent}>
                        <input type="text" value={mdTitle} onChange={e=>setMdTitle(e.target.value)} placeholder="예: 충북 제천시 한수면 덕곡리 명당혈" style={styles.input} />
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 위치 (주소)</div>
                    <div style={styles.formContent}>
                        <input type="text" value={mdLocation} onChange={e=>setMdLocation(e.target.value)} placeholder="예: 충청북도 제천시 한수면 덕곡리 산 63-1" style={styles.input} />
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 현장 사진 첨부 <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                    <div style={styles.formContent}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', border: '1px solid #CCC', backgroundColor: '#F9FAFB', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#555', borderRadius: '2px' }}>
                            <UploadCloud size={14} style={{marginRight: '6px'}} /> 사진 선택 (최대 5장)
                            <input type="file" multiple accept="image/*" onChange={handleMdImageSelect} style={{ display: 'none' }} />
                        </label>
                        
                        {/* 미리보기 이미지 썸네일 */}
                        {mdImagePreviews.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                {mdImagePreviews.map((url, i) => (
                                    <div key={i} style={{ position: 'relative', width: '40px', height: '40px', border: '1px solid #E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                                        <img src={url} alt="prev" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                                        <button onClick={()=>removeMdImage(i)} style={{position:'absolute', top: 0, right: 0, background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', width:'14px', height:'14px', display:'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer'}}>
                                            <X size={10}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <span style={{color: '#999', marginLeft: '8px'}}>(드래그 기능 미지원. 파일 다중 선택 가능)</span>
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 상세 설명 서식</div>
                    <div style={styles.formContent}>
                        <select value={mdFontFamily} onChange={e=>setMdFontFamily(e.target.value)} style={styles.select}>
                            <option value="inherit">시스템 기본 폰트</option>
                            <option value="'Noto Serif KR', serif">명조체 (전통적인 느낌)</option>
                        </select>
                        <select value={mdFontSize} onChange={e=>setMdFontSize(e.target.value)} style={styles.select}>
                            <option value="13px">작게 (13px)</option>
                            <option value="15px">보통 (15px)</option>
                            <option value="18px">크게 (18px)</option>
                        </select>
                    </div>
                </div>

                <div style={{...styles.formRow, borderBottom: 'none'}}>
                    <div style={styles.formLabel}>· 상세 설명 내용 <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                    <div style={{...styles.formContent, padding: '12px 16px'}}>
                        <textarea 
                            value={mdDescription} 
                            onChange={e=>setMdDescription(e.target.value)} 
                            placeholder="산세, 물길, 명당혈에 대한 풍수지리적 해석을 자세히 적어주세요."
                            style={{ width: '100%', minHeight: '120px', padding: '12px', border: '1px solid #CCC', borderRadius: '2px', outline: 'none', resize: 'vertical', fontSize: mdFontSize, fontFamily: mdFontFamily }} 
                        />
                    </div>
                </div>
            </div>

            {/* 등록 버튼 */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <button onClick={handleSave} disabled={isSaving} style={{ ...styles.submitBtn, opacity: isSaving ? 0.6 : 1 }}>
                    <Save size={16} /> {isSaving ? "데이터 병렬 업로드 및 저장 중..." : "포트폴리오 등록하기"}
                </button>
            </div>

            {/* 2. 등록된 명당 리스트 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>
                    <ImageIcon size={14} style={{verticalAlign: 'middle', marginRight:'4px'}}/>
                    등록된 사례 관리 <span style={{color: '#0ea5e9'}}>({mdPosts.length})</span>
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #333' }}>
                <thead>
                    <tr>
                        <th style={{...styles.tableHeader, width: '60px'}}>번호</th>
                        <th style={{...styles.tableHeader, width: '120px'}}>대표 썸네일</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>사례 제목</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>위치</th>
                        <th style={{...styles.tableHeader, width: '100px'}}>등록일</th>
                        {/* 🚨 상위 고정 열 추가 */}
                        <th style={{...styles.tableHeader, width: '90px'}}>상위 고정</th>
                        <th style={{...styles.tableHeader, width: '90px'}}>전시 상태</th>
                        <th style={{...styles.tableHeader, width: '60px'}}>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '12px' }}>데이터를 불러오는 중입니다...</td></tr>
                    ) : mdPosts.length === 0 ? (
                        <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '12px' }}>등록된 사례가 없습니다.</td></tr>
                    ) : (
                        mdPosts.map((p, idx) => (
                            <tr key={p.id} style={{ borderBottom: `1px solid ${styles.tableCell.borderBottom}`, backgroundColor: '#FFF' }}>
                                <td style={styles.tableCell}>{idx + 1}</td>
                                
                                <td style={{...styles.tableCell, padding: '8px 0'}}>
                                    <div style={{ width: '80px', height: '50px', backgroundColor: '#000', margin: '0 auto', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                        {p.image_urls && p.image_urls.length > 0 ? (
                                            <img src={p.image_urls[0]} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: p.is_visible ? 1 : 0.4 }} />
                                        ) : (
                                            <span style={{color:'#666', fontSize:'10px', lineHeight:'50px'}}>NO IMG</span>
                                        )}
                                    </div>
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px', fontWeight: 'bold', color: '#111'}}>
                                    {p.title}
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px'}}>
                                    {p.location || '-'}
                                </td>
                                
                                <td style={styles.tableCell}>
                                    {new Date(p.created_at).toLocaleDateString()}
                                </td>

                                {/* 🚨 상위 고정 버튼 영역 */}
                                <td style={styles.tableCell}>
                                    <button 
                                        onClick={() => togglePin(p.id, p.is_pinned)} 
                                        style={p.is_pinned ? styles.actionBtnOrange : styles.actionBtnGray}
                                    >
                                        {p.is_pinned ? '🔥 고정 ON' : '고정 OFF'}
                                    </button>
                                </td>

                                <td style={styles.tableCell}>
                                    <button 
                                        onClick={() => toggleVis(p.id, p.is_visible)} 
                                        style={p.is_visible ? styles.actionBtnBlue : styles.actionBtnRed}
                                    >
                                        {p.is_visible ? '공개 중' : '숨김 처리됨'}
                                    </button>
                                </td>
                                
                                <td style={styles.tableCell}>
                                    <button onClick={() => delPost(p.id, p.image_urls)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}>
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}