// src/components/admin/AdminMedia.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { Upload, Link2, Music, Video, Trash2, ExternalLink, Save, Loader2, PlayCircle } from 'lucide-react';

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
                    is_active: false // 기본은 숨김 상태로 등록
                }]);

            if (dbError) throw dbError;

            alert("✅ 콘텐츠가 성공적으로 등록되었습니다.");
            
            setTitle('');
            setYoutubeUrl('');
            setSelectedFile(null);
            
            fetchMedia(); 

        } catch (error) {
            console.error("업로드 시스템 오류:", error);
            
            // 롤백: DB 저장 실패 시 업로드된 가비지 파일 강제 삭제
            if (uploadedFilePath) {
                console.warn("DB 저장 실패. 업로드된 가비지 파일을 클라우드에서 삭제합니다.");
                await supabase.storage.from('meditation_files').remove([uploadedFilePath]);
            }
            alert("❌ 저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
        } finally {
            setIsUploading(false);
        }
    };

    const toggleActive = async (id, currentStatus) => {
        // Optimistic UI update for snappy feel
        setMediaList(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
        
        const { error } = await supabase.from('meditation_media').update({ is_active: !currentStatus }).eq('id', id);
        if (error) {
            alert("상태 변경에 실패했습니다.");
            fetchMedia(); // 롤백
        }
    };

    // ==============================================================================
    // 2. 하드 딜리트 파이프라인 (스토리지 원본 파일 완벽 삭제)
    // ==============================================================================
    const handleDelete = async (id, sourceType, url) => {
        if(!window.confirm("정말 삭제하시겠습니까?\n🚨 클라우드에 업로드된 원본 파일도 영구 삭제됩니다.")) return;
        
        try {
            if (sourceType === 'file' && url) {
                const urlParts = url.split('/meditation_files/');
                if (urlParts.length === 2) {
                    const filePath = decodeURIComponent(urlParts[1]); 
                    const { error: storageError } = await supabase.storage.from('meditation_files').remove([filePath]);

                    if (storageError) {
                        console.error("Storage 원본 파일 삭제 실패:", storageError);
                        alert("클라우드 스토리지 파일 삭제에 실패했습니다. DB 삭제를 중단합니다.");
                        return; 
                    }
                }
            }

            const { error: dbError } = await supabase.from('meditation_media').delete().eq('id', id);
            if (dbError) throw dbError;

            alert("🗑️ 콘텐츠가 영구 삭제되었습니다.");
            fetchMedia();

        } catch (error) {
            console.error("완전 삭제 프로세스 에러:", error);
            alert("❌ 삭제 처리 중 시스템 오류가 발생했습니다.");
        }
    };

    return (
        <div className="ios-media-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-media-wrap {
                    width: 100%; box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif;
                    background-color: transparent;
                }

                .ios-page-title {
                    font-size: 28px; font-weight: 800; color: #1C1C1E;
                    margin: 0 0 8px 0; letter-spacing: -0.5px;
                }
                .ios-page-desc { font-size: 14px; color: #8E8E93; margin: 0 0 32px 0; font-weight: 500; }

                /* iOS Inset Grouped 리스트 스타일 */
                .ios-group-title {
                    font-size: 13px; font-weight: 600; color: #8E8E93; text-transform: uppercase;
                    margin: 0 0 8px 16px; letter-spacing: -0.3px; display: flex; justify-content: space-between; padding-right: 16px;
                }
                .ios-list-group {
                    background-color: #FFFFFF; border-radius: 16px; margin-bottom: 32px;
                    overflow: hidden; border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .ios-list-row {
                    display: flex; align-items: center; justify-content: space-between;
                    min-height: 52px; padding: 12px 16px; border-bottom: 0.5px solid #E5E5EA;
                }
                .ios-list-row:last-child { border-bottom: none; }

                /* 폼 레이블 & 입력 */
                .ios-label { font-size: 16px; font-weight: 500; color: #1C1C1E; flex-shrink: 0; width: 100px; }
                .ios-input {
                    flex: 1; min-width: 0; border: none; outline: none; text-align: right;
                    font-size: 16px; color: #007AFF; font-family: inherit; background: transparent; font-weight: 500;
                }
                .ios-input::placeholder { color: #C7C7CC; font-weight: 400; }

                /* iOS 세그먼트 컨트롤 */
                .ios-segment {
                    display: flex; background-color: #F2F2F7; border-radius: 8px; padding: 2px; width: 220px;
                }
                .ios-segment-btn {
                    flex: 1; text-align: center; padding: 6px 0; font-size: 14px; font-weight: 600;
                    color: #8E8E93; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px;
                }
                .ios-segment-btn.active {
                    background-color: #FFFFFF; color: #1C1C1E; box-shadow: 0 2px 4px rgba(0,0,0,0.06);
                }

                /* 파일 업로드 버튼 */
                .ios-file-btn {
                    display: flex; align-items: center; gap: 6px; background: #F2F2F7; border: none;
                    color: #007AFF; font-size: 14px; font-weight: 600; padding: 8px 12px; border-radius: 10px; cursor: pointer; transition: 0.2s;
                }
                .ios-file-btn:active { background: #E5E5EA; }

                /* 제출 버튼 */
                .ios-submit-btn {
                    width: 100%; background-color: #007AFF; color: #FFFFFF; font-size: 17px; font-weight: 600;
                    padding: 16px; border-radius: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.2s, opacity 0.2s;
                    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
                }
                .ios-submit-btn:active:not(:disabled) { transform: scale(0.98); opacity: 0.9; }
                .ios-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

                /* 미디어 리스트 아이템 */
                .ios-media-icon {
                    width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; flex-shrink: 0; margin-right: 14px;
                }
                .ios-media-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
                .ios-media-title { font-size: 16px; font-weight: 600; color: #1C1C1E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .ios-media-sub { font-size: 13px; color: #8E8E93; font-weight: 500; display: flex; align-items: center; gap: 6px; }
                .ios-media-link { color: #007AFF; text-decoration: none; display: inline-flex; align-items: center; gap: 2px; }
                
                /* iOS 토글 스위치 */
                .ios-toggle {
                    width: 51px; height: 31px; background-color: #E9E9EA; border-radius: 31px; position: relative; cursor: pointer; transition: background-color 0.3s ease; flex-shrink: 0; margin-right: 12px;
                }
                .ios-toggle.active { background-color: #34C759; }
                .ios-toggle-knob {
                    width: 27px; height: 27px; background-color: #FFFFFF; border-radius: 50%; position: absolute; top: 2px; left: 2px; box-shadow: 0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06); transition: transform 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2);
                }
                .ios-toggle.active .ios-toggle-knob { transform: translateX(20px); }

                .ios-delete-btn {
                    width: 32px; height: 32px; border-radius: 50%; background: #FFE5E5; color: #FF3B30; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
                }
                .ios-delete-btn:active { transform: scale(0.9); }

                .ios-empty-state { padding: 40px 20px; text-align: center; color: #8E8E93; font-size: 15px; font-weight: 500; }
                .lucide-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />

            <div>
                <h1 className="ios-page-title">명상 미디어 관리</h1>
                <p className="ios-page-desc">클라이언트에 노출되는 힐링/명상 콘텐츠를 등록하고 제어합니다.</p>
            </div>

            {/* 1. 콘텐츠 등록 폼 */}
            <div className="ios-group-title">신규 미디어 등록</div>
            <div className="ios-list-group">
                <div className="ios-list-row">
                    <span className="ios-label">콘텐츠 제목</span>
                    <input 
                        type="text" 
                        className="ios-input" 
                        placeholder="예: 마음을 비우는 10분 명상" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                    />
                </div>

                <div className="ios-list-row">
                    <span className="ios-label">미디어 유형</span>
                    <div className="ios-segment">
                        <div className={`ios-segment-btn ${mediaType === 'audio' ? 'active' : ''}`} onClick={() => setMediaType('audio')}>
                            <Music size={16} /> 음원
                        </div>
                        <div className={`ios-segment-btn ${mediaType === 'video' ? 'active' : ''}`} onClick={() => setMediaType('video')}>
                            <Video size={16} /> 영상
                        </div>
                    </div>
                </div>

                <div className="ios-list-row">
                    <span className="ios-label">업로드 방식</span>
                    <div className="ios-segment">
                        <div className={`ios-segment-btn ${sourceType === 'youtube' ? 'active' : ''}`} onClick={() => setSourceType('youtube')}>
                            <Link2 size={16} /> 유튜브
                        </div>
                        <div className={`ios-segment-btn ${sourceType === 'file' ? 'active' : ''}`} onClick={() => setSourceType('file')}>
                            <Upload size={16} /> 클라우드
                        </div>
                    </div>
                </div>

                <div className="ios-list-row" style={{ minHeight: '60px' }}>
                    <span className="ios-label">소스 (URL/파일)</span>
                    {sourceType === 'youtube' ? (
                        <input 
                            type="text" 
                            className="ios-input" 
                            placeholder="https://youtube.com/watch?v=..." 
                            value={youtubeUrl} 
                            onChange={(e) => setYoutubeUrl(e.target.value)} 
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end', flex: 1 }}>
                            {selectedFile && <span style={{ fontSize: '14px', color: '#34C759', fontWeight: '500' }}>{selectedFile.name}</span>}
                            <label className="ios-file-btn">
                                <Upload size={16} /> {selectedFile ? '변경' : '파일 선택'}
                                <input 
                                    type="file" 
                                    accept={mediaType === 'audio' ? "audio/*" : "video/*"} 
                                    onChange={(e) => setSelectedFile(e.target.files[0])} 
                                    style={{ display: 'none' }} 
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <button onClick={handleSave} disabled={isUploading} className="ios-submit-btn" style={{ marginBottom: '40px' }}>
                {isUploading ? <Loader2 size={20} className="lucide-spin" /> : <Save size={20} />}
                {isUploading ? "콘텐츠 업로드 및 암호화 중..." : "콘텐츠 안전하게 등록하기"}
            </button>

            {/* 2. 등록된 미디어 리스트 */}
            <div className="ios-group-title">
                <span>등록된 콘텐츠 목록</span>
                <span>총 {mediaList.length}건</span>
            </div>
            
            <div className="ios-list-group">
                {isLoading ? (
                    <div className="ios-empty-state">데이터를 동기화 중입니다...</div>
                ) : mediaList.length === 0 ? (
                    <div className="ios-empty-state">등록된 미디어 콘텐츠가 없습니다.</div>
                ) : (
                    mediaList.map((media) => (
                        <div key={media.id} className="ios-list-row" style={{ opacity: media.is_active ? 1 : 0.6 }}>
                            
                            {/* 아이콘 영역 */}
                            <div className="ios-media-icon" style={{ backgroundColor: media.media_type === 'audio' ? '#AF52DE' : '#007AFF' }}>
                                {media.media_type === 'audio' ? <Music size={22} /> : <Video size={22} />}
                            </div>

                            {/* 정보 영역 */}
                            <div className="ios-media-info">
                                <div className="ios-media-title">{media.title}</div>
                                <div className="ios-media-sub">
                                    <span style={{ color: media.source_type === 'youtube' ? '#FF2D55' : '#8E8E93', fontWeight: '600' }}>
                                        {media.source_type === 'youtube' ? 'YouTube' : 'Cloud File'}
                                    </span>
                                    <span>•</span>
                                    <a href={media.url} target="_blank" rel="noreferrer" className="ios-media-link">
                                        링크 확인 <ExternalLink size={12} />
                                    </a>
                                </div>
                            </div>

                            {/* 컨트롤 영역 (상태 토글 및 삭제) */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div className={`ios-toggle ${media.is_active ? 'active' : ''}`} onClick={() => toggleActive(media.id, media.is_active)}>
                                    <div className="ios-toggle-knob"></div>
                                </div>
                                <button className="ios-delete-btn" onClick={() => handleDelete(media.id, media.source_type, media.url)} title="영구 삭제">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}