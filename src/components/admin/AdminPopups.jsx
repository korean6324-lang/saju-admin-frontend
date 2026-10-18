// src/components/admin/AdminPopups.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { Image, Link, Calendar, Trash2, Power, Type, LayoutTemplate, Edit } from 'lucide-react'; // Edit 아이콘 추가

// 자주 쓰는 팝업/이벤트/명리 관련 이모지 리스트
const EMOJI_LIST = ['🎁', '📢', '✨', '⭐', '👑', '🔮', '🌙', '🎉', '🔥', '💬', '💖', '🍀'];

export default function AdminPopups() {
    const [popups, setPopups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    // 수정 모드를 판별하기 위한 state (수정 중인 팝업의 ID 저장)
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        link_url: '',
        start_date: '',
        end_date: '',
        image_url: '',
        config: {
            mainText: '',
            mainTextAlign: 'center',
            fontSize: '28', 
            subText: '',
            subTextAlign: 'center',
            subFontSize: '15', 
            textColor: '#FFFFFF',
            overlayOpacity: 40
        }
    });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        fetchPopups();
    }, []);

    const fetchPopups = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('site_popups').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setPopups(data || []);
        } catch (error) { console.error('팝업 로딩 실패:', error); } 
        finally { setIsLoading(false); }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file)); 
        }
    };

    const handleConfigChange = (field, value) => {
        setFormData(prev => ({ ...prev, config: { ...prev.config, [field]: value } }));
    };

    const insertEmoji = (field, emoji) => {
        setFormData(prev => ({
            ...prev,
            config: {
                ...prev.config,
                [field]: (prev.config[field] || '') + emoji
            }
        }));
    };

    const handleEdit = (popup) => {
        let conf = {};
        try { conf = popup.popup_config ? JSON.parse(popup.popup_config) : {}; } catch(e){}

        const formatForDateTimeLocal = (isoString) => {
            if (!isoString) return '';
            const d = new Date(isoString);
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            return (new Date(d - tzoffset)).toISOString().slice(0, 16);
        };

        setFormData({
            title: popup.title || '',
            link_url: popup.link_url || '',
            start_date: formatForDateTimeLocal(popup.start_date),
            end_date: formatForDateTimeLocal(popup.end_date),
            image_url: popup.image_url || '',
            config: {
                mainText: conf.mainText || '',
                mainTextAlign: conf.mainTextAlign || 'center',
                fontSize: conf.fontSize || '28',
                subText: conf.subText || '',
                subTextAlign: conf.subTextAlign || 'center',
                subFontSize: conf.subFontSize || '15',
                textColor: conf.textColor || '#FFFFFF',
                overlayOpacity: conf.overlayOpacity || 40
            }
        });
        setEditingId(popup.id);
        setPreviewUrl(popup.image_url || ''); 
        window.scrollTo(0, 0); 
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            title: '', link_url: '', start_date: '', end_date: '', image_url: '',
            config: { mainText: '', mainTextAlign: 'center', fontSize: '28', subText: '', subTextAlign: 'center', subFontSize: '15', textColor: '#FFFFFF', overlayOpacity: 40 }
        });
        setImageFile(null); setPreviewUrl('');
        const fileInput = document.getElementById('popupImageInput');
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageFile && !formData.image_url) return alert('배경 이미지를 등록해주세요.');

        setIsUploading(true);
        try {
            let finalImageUrl = formData.image_url;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `popups/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, imageFile);
                if (uploadError) return alert(`이미지 업로드 실패: ${uploadError.message}`);
                
                const { data: publicUrlData } = supabase.storage.from('assets').getPublicUrl(filePath);
                finalImageUrl = publicUrlData.publicUrl;
            }

            const popupData = {
                title: formData.title || '제목 없음',
                image_url: finalImageUrl,
                link_url: formData.link_url || null,
                start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
                end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
                popup_config: JSON.stringify(formData.config),
                ...(editingId ? {} : { is_active: true })
            };

            if (editingId) {
                const { error: updateError } = await supabase.from('site_popups').update(popupData).eq('id', editingId);
                if (updateError) throw updateError;
                alert('디자인 팝업이 성공적으로 수정되었습니다.');
            } else {
                const { error: insertError } = await supabase.from('site_popups').insert([popupData]);
                if (insertError) throw insertError;
                alert('디자인 팝업이 성공적으로 등록되었습니다.');
            }

            handleCancelEdit();
            fetchPopups();

        } catch (error) { alert('데이터 처리 중 오류 발생'); } 
        finally { setIsUploading(false); }
    };

    const toggleActive = async (id, currentStatus) => {
        try {
            await supabase.from('site_popups').update({ is_active: !currentStatus }).eq('id', id);
            fetchPopups();
        } catch (error) { alert('상태 변경 실패'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;
        try {
            await supabase.from('site_popups').delete().eq('id', id);
            alert('삭제되었습니다.');
            if (editingId === id) handleCancelEdit();
            fetchPopups();
        } catch (error) { alert('삭제 실패'); }
    };

    return (
        <div className="ios-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-wrap { width: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif; }
                .ios-title { font-size: 24px; font-weight: 800; color: #1C1C1E; margin: 0 0 6px 0; letter-spacing: -0.5px; }
                .ios-desc { font-size: 13px; color: #8E8E93; margin: 0 0 24px 0; font-weight: 500; }
                
                .builder-container { display: flex; gap: 24px; margin-bottom: 32px; align-items: flex-start; flex-wrap: wrap; }
                .builder-left { flex: 1; min-width: 320px; background: #FFFFFF; border-radius: 16px; padding: 24px; border: 1px solid #E5E5EA; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
                
                /* 🚨 프론트엔드와 완벽하게 동일한 폭(380px)을 수용하기 위해 패널 넓이 확장 (430px) */
                .builder-right { width: 430px; flex-shrink: 0; background: #F9FAFB; border-radius: 20px; padding: 24px; border: 1px solid #E5E5EA; display: flex; flex-direction: column; align-items: center; position: sticky; top: 90px; }

                .form-section-title { font-size: 15px; font-weight: 800; color: #111827; margin: 0 0 16px 0; display: flex; align-items: center; gap: 6px; border-bottom: 2px solid #F3F4F6; padding-bottom: 8px; }
                .form-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; align-items: flex-start; }
                .form-group { flex: 1; min-width: 120px; display: flex; flex-direction: column; gap: 6px; }
                .form-label { font-size: 12px; font-weight: 700; color: #6B7280; display: flex; justify-content: space-between; align-items: center; }
                
                .ios-input { background: #F3F4F6; border: 1px solid transparent; border-radius: 8px; padding: 10px 12px; font-size: 13px; color: #1C1C1E; font-weight: 500; outline: none; transition: 0.2s; width: 100%; box-sizing: border-box; }
                .ios-input:focus { border-color: #3B82F6; background: #FFFFFF; }
                
                .emoji-palette { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px; }
                .emoji-btn { background: #FFFFFF; border: 1px solid #E5E5EA; border-radius: 6px; font-size: 14px; cursor: pointer; padding: 4px 6px; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: center; }
                .emoji-btn:hover { background: #F9FAFB; border-color: #D1D5DB; transform: translateY(-2px); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .emoji-btn:active { transform: translateY(0); }
                
                .color-picker { padding: 2px; height: 38px; cursor: pointer; }
                .range-slider { width: 100%; margin-top: 8px; accent-color: #3B82F6; }

                .ios-btn-primary { background: #007AFF; color: #FFF; border: none; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 800; cursor: pointer; transition: 0.2s; flex: 1; }
                .ios-btn-primary:active { transform: scale(0.98); }
                .ios-btn-primary:disabled { background: #9CA3AF; cursor: not-allowed; }

                .ios-btn-secondary { background: #E5E7EB; color: #4B5563; border: none; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 800; cursor: pointer; transition: 0.2s; margin-right: 12px; }
                .ios-btn-secondary:hover { background: #D1D5DB; }

                /* 🚨 팝업 미리보기 화면 1:1 싱크로율 강제 적용 */
                /* width 380px, height 475px 로 실제 고객 화면과 오차율 0% 유지 */
                .preview-phone { width: 380px; height: 475px; box-sizing: content-box; background-color: #E5E7EB; border-radius: 16px; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 4px solid #111827; }
                .preview-bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
                
                .preview-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 32px; box-sizing: border-box; }
                
                .preview-main-text { font-weight: 900; line-height: 1.3; margin: 0 0 12px 0; word-break: keep-all; letter-spacing: -0.5px; }
                .preview-sub-text { font-weight: 500; opacity: 0.9; margin: 0; line-height: 1.5; word-break: keep-all; letter-spacing: -0.3px; }

                .ios-table-wrap { background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E5E5EA; }
                .ios-table { width: 100%; border-collapse: collapse; }
                .ios-th { background-color: #F9FAFB; padding: 14px; text-align: left; font-size: 12px; font-weight: 700; color: #6B7280; border-bottom: 1px solid #E5E5EA; }
                .ios-td { padding: 16px 14px; border-bottom: 1px solid #E5E5EA; font-size: 13px; color: #1C1C1E; vertical-align: middle; }
                
                .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 4px; }
                .status-badge.active { background: #ECFDF5; color: #10B981; }
                .status-badge.inactive { background: #F3F4F6; color: #6B7280; }
            `}} />

            <div>
                <h2 className="ios-title">고급 팝업 빌더 (Free Layout)</h2>
                <p className="ios-desc">이미지 위에 텍스트와 이모지를 손쉽게 배치하고 크기를 자유롭게 설정하세요.</p>
            </div>

            <form onSubmit={handleSubmit} className="builder-container">
                <div className="builder-left">
                    <h3 className="form-section-title">
                        <Image size={16}/> 1. 배경 이미지 & 기본 설정
                        {editingId && <span style={{ color: '#EF4444', marginLeft: 'auto', fontSize: '13px' }}>[수정 모드]</span>}
                    </h3>
                    <div className="form-row" style={{ alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">배경 이미지 업로드 (권장: 1080x1350px 4:5 비율)</label>
                            <input type="file" id="popupImageInput" accept="image/*" className="ios-input" onChange={handleFileChange} />
                        </div>
                    </div>
                    <div className="form-row" style={{ alignItems: 'flex-end' }}>
                        <div className="form-group">
                            <label className="form-label">팝업 관리용 제목</label>
                            <input type="text" className="ios-input" placeholder="예: 신년맞이 타로 이벤트" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">클릭 시 이동 URL</label>
                            <input type="text" className="ios-input" placeholder="/tarot 또는 https://..." value={formData.link_url} onChange={e => setFormData({ ...formData, link_url: e.target.value })} />
                        </div>
                    </div>

                    <h3 className="form-section-title" style={{ marginTop: '32px' }}><Type size={16}/> 2. 텍스트 오버레이 디자인</h3>
                    
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">
                                메인 텍스트
                                <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>아래 이모지를 클릭하여 삽입</span>
                            </label>
                            <div className="emoji-palette">
                                {EMOJI_LIST.map(em => (
                                    <button type="button" key={`main-${em}`} className="emoji-btn" onClick={() => insertEmoji('mainText', em)} title="클릭하여 삽입">
                                        {em}
                                    </button>
                                ))}
                            </div>
                            <input type="text" className="ios-input" placeholder="매일 쏟아지는 무료 혜택!" value={formData.config.mainText} onChange={e => handleConfigChange('mainText', e.target.value)} />
                        </div>
                        
                        <div className="form-group" style={{ flex: 0.5 }}>
                            <label className="form-label">크기 (px)</label>
                            <input type="number" className="ios-input" placeholder="28" value={formData.config.fontSize} onChange={e => handleConfigChange('fontSize', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 0.8 }}>
                            <label className="form-label">정렬</label>
                            <select className="ios-input" value={formData.config.mainTextAlign} onChange={e => handleConfigChange('mainTextAlign', e.target.value)}>
                                <option value="left">왼쪽</option>
                                <option value="center">가운데</option>
                                <option value="right">오른쪽</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">
                                서브 텍스트
                            </label>
                            <div className="emoji-palette">
                                {EMOJI_LIST.map(em => (
                                    <button type="button" key={`sub-${em}`} className="emoji-btn" onClick={() => insertEmoji('subText', em)} title="클릭하여 삽입">
                                        {em}
                                    </button>
                                ))}
                            </div>
                            <textarea className="ios-input" rows="2" placeholder="로그인만 해도 최고급 서비스를..." value={formData.config.subText} onChange={e => handleConfigChange('subText', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 0.5 }}>
                            <label className="form-label">크기 (px)</label>
                            <input type="number" className="ios-input" placeholder="15" value={formData.config.subFontSize} onChange={e => handleConfigChange('subFontSize', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 0.8 }}>
                            <label className="form-label">정렬</label>
                            <select className="ios-input" value={formData.config.subTextAlign} onChange={e => handleConfigChange('subTextAlign', e.target.value)}>
                                <option value="left">왼쪽</option>
                                <option value="center">가운데</option>
                                <option value="right">오른쪽</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row" style={{ alignItems: 'center' }}>
                        <div className="form-group" style={{ flex: 0.5 }}>
                            <label className="form-label">텍스트 색상</label>
                            <input type="color" className="ios-input color-picker" value={formData.config.textColor} onChange={e => handleConfigChange('textColor', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">배경 어둡기 (딤 처리: {formData.config.overlayOpacity}%)</label>
                            <input type="range" min="0" max="90" className="range-slider" value={formData.config.overlayOpacity} onChange={e => handleConfigChange('overlayOpacity', e.target.value)} />
                        </div>
                    </div>

                    <h3 className="form-section-title" style={{ marginTop: '32px' }}><Calendar size={16}/> 3. 노출 스케줄</h3>
                    <div className="form-row" style={{ alignItems: 'flex-end' }}>
                        <div className="form-group">
                            <label className="form-label">시작 일시</label>
                            <input type="datetime-local" className="ios-input" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">종료 일시</label>
                            <input type="datetime-local" className="ios-input" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', marginTop: '16px' }}>
                        {editingId && (
                            <button type="button" className="ios-btn-secondary" onClick={handleCancelEdit}>
                                수정 취소
                            </button>
                        )}
                        <button type="submit" className="ios-btn-primary" disabled={isUploading}>
                            {isUploading ? '데이터 처리 중...' : (editingId ? '수정 내용 저장하기' : '최종 팝업 배포하기')}
                        </button>
                    </div>
                </div>

                {/* 오른쪽: 실시간 렌더링 (설정값 실시간 반영) */}
                <div className="builder-right">
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#4B5563', margin: '0 0 16px 0', alignSelf: 'flex-start' }}>
                        <LayoutTemplate size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }}/> 
                        실시간 렌더링 미리보기
                    </h3>
                    
                    <div className="preview-phone">
                        <div className="preview-bg" style={{ backgroundImage: `url(${previewUrl || formData.image_url || 'https://via.placeholder.com/400x500?text=Background+Image'})` }} />
                        
                        <div className="preview-overlay" style={{ backgroundColor: `rgba(0, 0, 0, ${formData.config.overlayOpacity / 100})` }}>
                            
                            {formData.config.mainText && (
                                <h2 className="preview-main-text" style={{ 
                                    fontSize: `${formData.config.fontSize || 28}px`,
                                    textAlign: formData.config.mainTextAlign || 'center',
                                    color: formData.config.textColor 
                                }}>
                                    {formData.config.mainText.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                                </h2>
                            )}
                            
                            {formData.config.subText && (
                                <p className="preview-sub-text" style={{ 
                                    fontSize: `${formData.config.subFontSize || 15}px`,
                                    textAlign: formData.config.subTextAlign || 'center',
                                    color: formData.config.textColor 
                                }}>
                                    {formData.config.subText.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </form>

            <div className="ios-table-wrap">
                <table className="ios-table">
                    <thead>
                        <tr>
                            <th className="ios-th">디자인 썸네일</th>
                            <th className="ios-th">제목 / 연결 링크</th>
                            <th className="ios-th">노출 스케줄</th>
                            <th className="ios-th">상태</th>
                            <th className="ios-th" style={{ textAlign: 'center' }}>수정 / 삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" className="ios-td" style={{ textAlign: 'center', padding: '40px' }}>로딩 중...</td></tr>
                        ) : popups.length === 0 ? (
                            <tr><td colSpan="5" className="ios-td" style={{ textAlign: 'center', padding: '40px' }}>등록된 팝업이 없습니다.</td></tr>
                        ) : (
                            popups.map(popup => {
                                let conf = {};
                                try { conf = popup.popup_config ? JSON.parse(popup.popup_config) : {}; } catch(e){}
                                return (
                                    <tr key={popup.id} className="ios-tr">
                                        <td className="ios-td" style={{ width: '80px' }}>
                                            <div style={{ width: '50px', height: '64px', borderRadius: '6px', overflow: 'hidden', position: 'relative', border: '1px solid #E5E7EB' }}>
                                                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${popup.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                                <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${(conf.overlayOpacity||0)/100})` }} />
                                            </div>
                                        </td>
                                        <td className="ios-td">
                                            <div style={{ fontWeight: '800', color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{popup.title}</div>
                                            <div style={{ fontSize: '12px', color: '#3B82F6' }}>{popup.link_url || '연결 링크 없음'}</div>
                                        </td>
                                        <td className="ios-td" style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
                                            {popup.start_date ? new Date(popup.start_date).toLocaleString() : '무제한'} <br/>
                                            ~ {popup.end_date ? new Date(popup.end_date).toLocaleString() : '무제한'}
                                        </td>
                                        <td className="ios-td">
                                            <button className={`status-badge ${popup.is_active ? 'active' : 'inactive'}`} onClick={() => toggleActive(popup.id, popup.is_active)}>
                                                <Power size={12} /> {popup.is_active ? '노출 중' : '숨김'}
                                            </button>
                                        </td>
                                        <td className="ios-td" style={{ textAlign: 'center' }}>
                                            <button style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', marginRight: '16px' }} onClick={() => handleEdit(popup)} title="수정하기">
                                                <Edit size={18} />
                                            </button>
                                            <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }} onClick={() => handleDelete(popup.id)} title="삭제하기">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}