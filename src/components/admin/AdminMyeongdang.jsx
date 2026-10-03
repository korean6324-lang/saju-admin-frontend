// src/components/admin/AdminMyeongdang.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Map, UploadCloud, Save, X, Trash2, Image as ImageIcon, MapPin, Pin, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

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
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // 🚨 파서 로직 유지 (안전 방어)
    const getSafeImages = (urls) => {
        if (!urls) return [];
        let parsedArray = [];
        
        if (Array.isArray(urls)) {
            parsedArray = urls;
        } else if (typeof urls === 'string') {
            try {
                const parsed = JSON.parse(urls);
                parsedArray = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                parsedArray = [urls]; 
            }
        }

        return parsedArray.filter(Boolean).map(url => {
            if (typeof url !== 'string') return '';
            if (url.startsWith('http') || url.startsWith('data:')) return url;
            const { data } = supabase.storage.from('myeongdang_images').getPublicUrl(url);
            return data.publicUrl;
        }).filter(url => url !== '');
    };

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
    // 🚀 2. 병렬 업로드 및 롤백 (로직 100% 유지)
    // ==============================================================================
    const handleSave = async () => {
        if (!mdTitle || !mdDescription) return alert('제목과 설명을 입력해주세요.');
        if (mdImages.length === 0) return alert('최소 1장 이상의 사진을 업로드해주세요.');
        
        setIsSaving(true);
        let uploadedPaths = [];
        let uploadedUrls = [];

        try {
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

            const { error: dbError } = await supabase.from('myeongdang_posts').insert([{
                user_id: session?.user?.id || null, 
                title: mdTitle, 
                location: mdLocation, 
                description: mdDescription,
                image_urls: uploadedUrls, 
                font_size: mdFontSize, 
                font_family: mdFontFamily, 
                is_visible: true,
                is_pinned: false,
                pin_order: 999
            }]);

            if (dbError) throw dbError;

            alert('✅ 천하대명당 포트폴리오가 성공적으로 등록되었습니다!');
            
            setMdTitle(''); setMdLocation(''); setMdDescription(''); setMdImages([]); setMdImagePreviews([]);
            queryClient.invalidateQueries(['myeongdangPosts']);

        } catch (error) {
            console.error("업로드 에러:", error);
            if (uploadedPaths.length > 0) {
                console.warn("DB 저장 실패로 롤백 수행");
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

    const togglePin = async (id, currentPin) => {
        const { error } = await supabase.from('myeongdang_posts').update({ 
            is_pinned: !currentPin,
            pin_order: 999 
        }).eq('id', id);
        if (!error) queryClient.invalidateQueries(['myeongdangPosts']);
        else alert('상위 고정 상태 변경에 실패했습니다.');
    };

    const movePinOrder = async (id, currentOrder, direction) => {
        let order = (currentOrder === null || currentOrder === undefined) ? 999 : currentOrder;
        let newOrder;

        if (direction === 'up') {
            newOrder = order === 999 ? 1 : order - 1;
            if (newOrder < 1) newOrder = 1; 
        } else {
            newOrder = order === 999 ? 2 : order + 1;
        }

        const { error } = await supabase.from('myeongdang_posts').update({ pin_order: newOrder }).eq('id', id);
        if (!error) queryClient.invalidateQueries(['myeongdangPosts']);
        else alert('순서 변경에 실패했습니다.');
    };

    // ==============================================================================
    // 🚀 3. 하드 딜리트
    // ==============================================================================
    const delPost = async (id, rawImageUrls) => {
        if (!window.confirm("사례를 삭제하시겠습니까?\n🚨 스토리지에 저장된 원본 이미지 파일들도 영구 삭제됩니다.")) return;
        
        try {
            const imageUrls = getSafeImages(rawImageUrls);
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

    return (
        <div className="ios-md-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-md-wrap {
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

                /* 폼 요소 */
                .ios-label { font-size: 16px; font-weight: 500; color: #1C1C1E; flex-shrink: 0; width: 110px; }
                .ios-input-clean {
                    flex: 1; min-width: 0; border: none; outline: none; text-align: right;
                    font-size: 16px; color: #007AFF; font-family: inherit; background: transparent; font-weight: 500;
                }
                .ios-input-clean::placeholder { color: #C7C7CC; font-weight: 400; }
                
                .ios-select-clean {
                    border: none; outline: none; background: transparent; text-align: right; direction: rtl;
                    font-size: 15px; color: #007AFF; font-weight: 500; -webkit-appearance: none; appearance: none; font-family: inherit; cursor: pointer; padding: 0 4px;
                }

                /* 세그먼트 컨트롤 */
                .ios-segment { display: flex; background-color: #F2F2F7; border-radius: 8px; padding: 2px; width: 220px; }
                .ios-segment-btn {
                    flex: 1; text-align: center; padding: 6px 0; font-size: 13px; font-weight: 600;
                    color: #8E8E93; border-radius: 6px; cursor: pointer; transition: all 0.2s;
                }
                .ios-segment-btn.active { background-color: #FFFFFF; color: #1C1C1E; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }

                /* 버튼 */
                .ios-upload-trigger {
                    display: flex; align-items: center; gap: 6px; background: #F2F2F7; border: none;
                    color: #007AFF; font-size: 14px; font-weight: 600; padding: 8px 12px; border-radius: 10px; cursor: pointer; transition: 0.2s;
                }
                .ios-upload-trigger:active { background: #E5E5EA; }

                .ios-submit-btn {
                    width: 100%; background-color: #007AFF; color: #FFFFFF; font-size: 17px; font-weight: 600;
                    padding: 16px; border-radius: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.2s, opacity 0.2s;
                    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
                }
                .ios-submit-btn:active:not(:disabled) { transform: scale(0.98); opacity: 0.9; }
                .ios-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

                /* 토글 스위치 */
                .ios-toggle {
                    width: 51px; height: 31px; background-color: #E9E9EA; border-radius: 31px; position: relative; cursor: pointer; transition: background-color 0.3s ease; flex-shrink: 0;
                }
                .ios-toggle.active { background-color: #34C759; }
                .ios-toggle-knob {
                    width: 27px; height: 27px; background-color: #FFFFFF; border-radius: 50%; position: absolute; top: 2px; left: 2px; box-shadow: 0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06); transition: transform 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2);
                }
                .ios-toggle.active .ios-toggle-knob { transform: translateX(20px); }

                /* 명당 리스트 아이템 */
                .ios-media-icon {
                    width: 60px; height: 60px; border-radius: 12px; overflow: hidden; background-color: #F2F2F7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 14px; border: 0.5px solid #E5E5EA;
                }
                .ios-media-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
                .ios-media-title { font-size: 16px; font-weight: 600; color: #1C1C1E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px; }
                .ios-media-sub { font-size: 13px; color: #8E8E93; font-weight: 500; display: flex; align-items: center; gap: 4px; }
                
                .ios-badge-pin { background-color: #FFF5E5; color: #FF9500; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 0.5px solid #FFD60A; }

                .ios-delete-btn {
                    width: 32px; height: 32px; border-radius: 50%; background: #FFE5E5; color: #FF3B30; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; margin-left: 12px;
                }
                .ios-delete-btn:active { transform: scale(0.9); }

                .ios-empty-state { padding: 40px 20px; text-align: center; color: #8E8E93; font-size: 15px; font-weight: 500; }
                .lucide-spin { animation: spin 1s linear infinite; }
            `}} />

            <div>
                <h1 className="ios-page-title">천하대명당 DB 관리</h1>
                <p className="ios-page-desc">풍수지리 명당 포트폴리오를 등록하고 전시 상태를 관리합니다. (관리자 및 파트너 전용)</p>
            </div>

            {/* 1. 콘텐츠 등록 폼 */}
            <div className="ios-group-title">신규 사례 등록</div>
            <div className="ios-list-group">
                <div className="ios-list-row">
                    <span className="ios-label">사례 제목</span>
                    <input type="text" className="ios-input-clean" placeholder="예: 충북 제천시 한수면 명당혈" value={mdTitle} onChange={e=>setMdTitle(e.target.value)} />
                </div>

                <div className="ios-list-row">
                    <span className="ios-label">위치 (주소)</span>
                    <input type="text" className="ios-input-clean" placeholder="예: 충청북도 제천시 한수면 덕곡리" value={mdLocation} onChange={e=>setMdLocation(e.target.value)} />
                </div>

                <div className="ios-list-row" style={{ minHeight: '60px', flexWrap: 'wrap', gap: '12px' }}>
                    <span className="ios-label">현장 사진</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end', flex: 1 }}>
                        {mdImagePreviews.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {mdImagePreviews.map((url, i) => (
                                    <div key={i} style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', border: '0.5px solid #C6C6C8' }}>
                                        <img src={url} alt="prev" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                                        <button onClick={()=>removeMdImage(i)} style={{position:'absolute', top:0, right:0, background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', width:'14px', height:'14px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', borderBottomLeftRadius: '4px'}}>
                                            <X size={10}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <label className="ios-upload-trigger">
                            <UploadCloud size={16} /> 사진 추가 (최대 5장)
                            <input type="file" multiple accept="image/*" onChange={handleMdImageSelect} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                <div className="ios-list-row">
                    <span className="ios-label">서식 (폰트/크기)</span>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flex: 1 }}>
                        <select className="ios-select-clean" value={mdFontFamily} onChange={e=>setMdFontFamily(e.target.value)}>
                            <option value="inherit">시스템 기본 폰트</option>
                            <option value="'Noto Serif KR', serif">명조체 (전통적)</option>
                        </select>
                        <div style={{ width: '1px', background: '#E5E5EA' }}></div>
                        <div className="ios-segment" style={{ width: '160px' }}>
                            <div className={`ios-segment-btn ${mdFontSize === '13px' ? 'active' : ''}`} onClick={() => setMdFontSize('13px')}>작게</div>
                            <div className={`ios-segment-btn ${mdFontSize === '15px' ? 'active' : ''}`} onClick={() => setMdFontSize('15px')}>보통</div>
                            <div className={`ios-segment-btn ${mdFontSize === '18px' ? 'active' : ''}`} onClick={() => setMdFontSize('18px')}>크게</div>
                        </div>
                    </div>
                </div>

                <div className="ios-list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                    <span className="ios-label" style={{ width: '100%', marginBottom: '12px' }}>상세 설명 내용</span>
                    <textarea 
                        value={mdDescription} 
                        onChange={e=>setMdDescription(e.target.value)} 
                        placeholder="산세, 물길, 명당혈에 대한 풍수지리적 해석을 자세히 적어주세요."
                        style={{ width: '100%', minHeight: '100px', border: 'none', background: '#F9F9FB', borderRadius: '12px', padding: '16px', outline: 'none', resize: 'vertical', fontSize: mdFontSize, fontFamily: mdFontFamily, color: '#1C1C1E', boxSizing: 'border-box' }} 
                    />
                </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="ios-submit-btn" style={{ marginBottom: '40px' }}>
                {isSaving ? <Loader2 size={20} className="lucide-spin" /> : <Save size={20} />}
                {isSaving ? "데이터 병렬 업로드 및 저장 중..." : "포트폴리오 등록하기"}
            </button>

            {/* 2. 등록된 사례 리스트 */}
            <div className="ios-group-title">
                <span>등록된 사례 관리</span>
                <span>총 {mdPosts.length}건</span>
            </div>
            
            <div className="ios-list-group">
                {isLoading ? (
                    <div className="ios-empty-state">데이터를 동기화 중입니다...</div>
                ) : mdPosts.length === 0 ? (
                    <div className="ios-empty-state">등록된 명당 사례가 없습니다.</div>
                ) : (
                    mdPosts.map((p) => {
                        const safeImages = getSafeImages(p.image_urls);
                        
                        return (
                            <div key={p.id} className="ios-list-row" style={{ opacity: p.is_visible ? 1 : 0.6, flexWrap: 'wrap' }}>
                                
                                {/* 썸네일 & 텍스트 */}
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '240px' }}>
                                    <div className="ios-media-icon">
                                        {safeImages.length > 0 ? (
                                            <img src={safeImages[0]} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <ImageIcon size={20} color="#C7C7CC" />
                                        )}
                                    </div>
                                    <div className="ios-media-info">
                                        <div className="ios-media-title">
                                            {p.is_pinned && <span className="ios-badge-pin">HOT</span>}
                                            {p.title}
                                        </div>
                                        <div className="ios-media-sub">
                                            <MapPin size={12} color="#8E8E93" /> {p.location || '위치 미상'}
                                        </div>
                                        <div className="ios-media-sub" style={{ fontSize: '11px' }}>
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                {/* 컨트롤 영역 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, paddingTop: '8px' }}>
                                    
                                    {/* 상위 고정 (Pin) 뱃지 및 순서 변경 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: '#F9F9FB', padding: '6px', borderRadius: '10px', minWidth: '70px' }}>
                                        <div 
                                            onClick={() => togglePin(p.id, p.is_pinned)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: p.is_pinned ? '#FF9500' : '#8E8E93', cursor: 'pointer' }}
                                        >
                                            <Pin size={14} fill={p.is_pinned ? '#FF9500' : 'none'} /> 고정
                                        </div>
                                        {p.is_pinned && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <button onClick={() => movePinOrder(p.id, p.pin_order, 'up')} style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', padding: 0 }}><ChevronUp size={16}/></button>
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1C1C1E', width: '24px', textAlign: 'center' }}>
                                                    {p.pin_order === 999 ? '-' : `${p.pin_order}위`}
                                                </span>
                                                <button onClick={() => movePinOrder(p.id, p.pin_order, 'down')} style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', padding: 0 }}><ChevronDown size={16}/></button>
                                            </div>
                                        )}
                                    </div>

                                    {/* 숨김 처리 토글 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#8E8E93' }}>{p.is_visible ? '공개' : '숨김'}</span>
                                        <div className={`ios-toggle ${p.is_visible ? 'active' : ''}`} style={{ margin: 0 }} onClick={() => toggleVis(p.id, p.is_visible)}>
                                            <div className="ios-toggle-knob"></div>
                                        </div>
                                    </div>

                                    {/* 삭제 버튼 */}
                                    <button className="ios-delete-btn" onClick={() => delPost(p.id, p.image_urls)} title="영구 삭제">
                                        <Trash2 size={16} />
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