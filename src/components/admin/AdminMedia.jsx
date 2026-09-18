// src/components/admin/AdminMedia.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { Upload, Link, Music, Video, Trash2, CheckCircle2, MonitorPlay, AlertCircle, ExternalLink, Save } from 'lucide-react';

export default function AdminMedia() {
    const [mediaList, setMediaList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // 폼 상태 관리
    const [title, setTitle] = useState('');
    const [mediaType, setMediaType] = useState('audio'); // 'audio' | 'video'
    const [sourceType, setSourceType] = useState('youtube'); // 'youtube' | 'file'
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const fetchMedia = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('meditation_media')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data && !error) setMediaList(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMedia();
    }, []);

    // ==============================================================================
    // 1. 업로드 로직 (에러 발생 시 방어 및 롤백)
    // ==============================================================================
    const handleSave = async () => {
        if (!title) return alert("제목을 입력해주세요.");
        
        setIsUploading(true);
        let finalUrl = '';
        let uploadedFilePath = ''; 

        try {
            if (sourceType === 'youtube') {
                if (!youtubeUrl) return alert("유튜브 주소를 입력해주세요.");
                finalUrl = youtubeUrl;
            } else {
                if (!selectedFile) return alert("업로드할 파일을 선택해주세요.");
                
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${mediaType}s/${fileName}`; 
                uploadedFilePath = filePath;

                const { error: uploadError } = await supabase.storage
                    .from('meditation_files')
                    .upload(filePath, selectedFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('meditation_files')
                    .getPublicUrl(filePath);

                finalUrl = publicUrlData.publicUrl;
            }

            const { error: dbError } = await supabase
                .from('meditation_media')
                .insert([{
                    title,
                    media_type: mediaType,
                    source_type: sourceType,
                    url: finalUrl,
                    is_active: false
                }]);

            if (dbError) throw dbError;

            alert("✅ 콘텐츠가 성공적으로 등록되었습니다.");
            
            setTitle('');
            setYoutubeUrl('');
            setSelectedFile(null);
            
            fetchMedia(); 

        } catch (error) {
            console.error("업로드 시스템 오류:", error);
            
            // 롤백
            if (uploadedFilePath) {
                console.warn("DB 저장 실패. 업로드된 가비지 파일을 클라우드에서 강제 삭제합니다.");
                await supabase.storage.from('meditation_files').remove([uploadedFilePath]);
            }
            alert("❌ 저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
        } finally {
            setIsUploading(false);
        }
    };

    const toggleActive = async (id, currentStatus) => {
        const { error } = await supabase.from('meditation_media').update({ is_active: !currentStatus }).eq('id', id);
        if (!error) fetchMedia();
    };

    // ==============================================================================
    // 2. 하드 딜리트 파이프라인 (스토리지 원본 파일 완벽 삭제)
    // ==============================================================================
    const handleDelete = async (id, sourceType, url) => {
        if(!window.confirm("정말 삭제하시겠습니까?\n🚨 서버에 업로드된 원본 파일도 클라우드에서 영구 삭제됩니다.")) return;
        
        try {
            if (sourceType === 'file' && url) {
                const urlParts = url.split('/meditation_files/');
                if (urlParts.length === 2) {
                    const filePath = decodeURIComponent(urlParts[1]); 
                    const { error: storageError } = await supabase.storage.from('meditation_files').remove([filePath]);

                    if (storageError) {
                        console.error("Storage 원본 파일 삭제 실패:", storageError);
                        alert("클라우드 스토리지에서 파일을 삭제하는데 실패했습니다. DB 삭제를 중단합니다.");
                        return; 
                    }
                }
            }

            const { error: dbError } = await supabase.from('meditation_media').delete().eq('id', id);
            if (dbError) throw dbError;

            alert("🗑️ 콘텐츠와 원본 미디어 파일이 완벽하게 영구 삭제되었습니다.");
            fetchMedia();

        } catch (error) {
            console.error("완전 삭제 프로세스 에러:", error);
            alert("❌ 삭제 처리 중 시스템 오류가 발생했습니다.");
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
        formContent: { flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', flexWrap: 'wrap' },
        
        input: { padding: '6px 10px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', width: '100%', maxWidth: '500px' },
        radioLabel: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' },
        
        submitBtn: { backgroundColor: '#0ea5e9', color: '#FFF', border: 'none', padding: '10px 40px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
        
        // 테이블
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '12px' },
        tableCell: { padding: '8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
        
        actionBtnBlue: { padding: '4px 8px', border: '1px solid #0ea5e9', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#0ea5e9' },
        actionBtnRed: { padding: '4px 8px', border: '1px solid #ef4444', backgroundColor: '#FFF', borderRadius: '2px', fontSize: '11px', cursor: 'pointer', color: '#ef4444' }
    };

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 */}
            <div>
                <h2 style={styles.headerTitle}>명상 미디어 등록 및 관리</h2>
                <p style={styles.headerSub}>[콘텐츠 관리 &gt; 명상 미디어] 음원 및 영상 콘텐츠를 등록하고, 클라이언트 노출 상태를 제어합니다.</p>
            </div>

            {/* 1. 꽉 찬 표 형태의 등록 폼 */}
            <div style={styles.formBox}>
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 콘텐츠 제목 <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                    <div style={styles.formContent}>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder="예: 마음을 편안하게 해주는 수식관 명상" 
                            style={styles.input} 
                        />
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 미디어 유형</div>
                    <div style={styles.formContent}>
                        <label style={styles.radioLabel}>
                            <input type="radio" checked={mediaType === 'audio'} onChange={() => setMediaType('audio')} />
                            <Music size={14} style={{marginLeft: '2px'}}/> 음원 (Audio)
                        </label>
                        <span style={{color: '#CCC'}}>|</span>
                        <label style={styles.radioLabel}>
                            <input type="radio" checked={mediaType === 'video'} onChange={() => setMediaType('video')} />
                            <Video size={14} style={{marginLeft: '2px'}}/> 영상 (Video)
                        </label>
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formLabel}>· 업로드 방식</div>
                    <div style={styles.formContent}>
                        <label style={styles.radioLabel}>
                            <input type="radio" checked={sourceType === 'youtube'} onChange={() => setSourceType('youtube')} />
                            <Link size={14} style={{color: '#ef4444', marginLeft: '2px'}}/> 유튜브 연동
                        </label>
                        <span style={{color: '#CCC'}}>|</span>
                        <label style={styles.radioLabel}>
                            <input type="radio" checked={sourceType === 'file'} onChange={() => setSourceType('file')} />
                            <Upload size={14} style={{color: '#0ea5e9', marginLeft: '2px'}}/> 직접 파일 업로드
                        </label>
                    </div>
                </div>

                <div style={{...styles.formRow, borderBottom: 'none'}}>
                    <div style={styles.formLabel}>· 소스 (Source) <span style={{color:'#ef4444', marginLeft:'4px'}}>*</span></div>
                    <div style={styles.formContent}>
                        {sourceType === 'youtube' ? (
                            <input 
                                type="text" 
                                value={youtubeUrl} 
                                onChange={(e) => setYoutubeUrl(e.target.value)} 
                                placeholder="유튜브 링크 주소 (예: https://www.youtube.com/watch?v=...)" 
                                style={styles.input} 
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', border: '1px solid #CCC', backgroundColor: '#F9FAFB', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#555', borderRadius: '2px' }}>
                                    <Upload size={14} style={{marginRight: '6px'}} /> {selectedFile ? '파일 변경' : '파일 선택'}
                                    <input 
                                        type="file" 
                                        accept={mediaType === 'audio' ? "audio/*" : "video/*"} 
                                        onChange={(e) => setSelectedFile(e.target.files[0])} 
                                        style={{ display: 'none' }} 
                                    />
                                </label>
                                {selectedFile && <span style={{ color: '#059669', fontWeight: 'bold' }}>{selectedFile.name} 선택됨</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 등록 버튼 */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <button onClick={handleSave} disabled={isUploading} style={{ ...styles.submitBtn, opacity: isUploading ? 0.6 : 1 }}>
                    <Save size={16} /> {isUploading ? "클라우드 업로드 및 암호화 중..." : "콘텐츠 안전하게 등록하기"}
                </button>
            </div>

            {/* 2. 등록된 미디어 리스트 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>
                    <MonitorPlay size={14} style={{verticalAlign: 'middle', marginRight:'4px'}}/>
                    등록된 콘텐츠 목록 <span style={{color: '#0ea5e9'}}>({mediaList.length})</span>
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #333' }}>
                <thead>
                    <tr>
                        <th style={{...styles.tableHeader, width: '60px'}}>번호</th>
                        <th style={{...styles.tableHeader, width: '100px'}}>유형</th>
                        <th style={{...styles.tableHeader, width: '120px'}}>업로드 방식</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>콘텐츠 제목</th>
                        <th style={{...styles.tableHeader, width: '100px'}}>소스 링크</th>
                        <th style={{...styles.tableHeader, width: '100px'}}>상태</th>
                        <th style={{...styles.tableHeader, width: '140px'}}>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '12px' }}>데이터를 불러오는 중입니다...</td></tr>
                    ) : mediaList.length === 0 ? (
                        <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '12px' }}>등록된 미디어 콘텐츠가 없습니다.</td></tr>
                    ) : (
                        mediaList.map((media, idx) => (
                            <tr key={media.id} style={{ borderBottom: `1px solid ${styles.tableCell.borderBottom}`, backgroundColor: media.is_active ? '#FFF' : '#F9FAFB' }}>
                                <td style={styles.tableCell}>{idx + 1}</td>
                                
                                <td style={{...styles.tableCell, fontWeight: 'bold'}}>
                                    {media.media_type === 'audio' ? <span style={{color: '#666'}}><Music size={12} style={{marginRight:'2px'}}/>음원</span> : <span style={{color: '#111'}}><Video size={12} style={{marginRight:'2px'}}/>영상</span>}
                                </td>
                                
                                <td style={{...styles.tableCell, color: '#666'}}>
                                    {media.source_type === 'youtube' ? '유튜브 연동' : '직접 업로드'}
                                </td>
                                
                                <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px', fontWeight: 'bold', color: '#111'}}>
                                    {media.title}
                                </td>

                                <td style={styles.tableCell}>
                                    <a href={media.url} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                        보기 <ExternalLink size={12} />
                                    </a>
                                </td>

                                <td style={styles.tableCell}>
                                    {media.is_active ? (
                                        <span style={{ color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <CheckCircle2 size={12}/> 서비스중
                                        </span>
                                    ) : (
                                        <span style={{ color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <AlertCircle size={12}/> 숨김처리
                                        </span>
                                    )}
                                </td>
                                
                                <td style={{...styles.tableCell, display: 'flex', justifyContent: 'center', gap: '4px'}}>
                                    <button 
                                        onClick={() => toggleActive(media.id, media.is_active)} 
                                        style={media.is_active ? styles.actionBtnRed : styles.actionBtnBlue}
                                    >
                                        {media.is_active ? '숨기기' : '노출하기'}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(media.id, media.source_type, media.url)} 
                                        style={{...styles.actionBtn, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px'}}
                                    >
                                        <Trash2 size={12}/> 삭제
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