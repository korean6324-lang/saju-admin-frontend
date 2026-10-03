// src/components/admin/AdminMyeongdangRequests.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { CheckCircle, Clock, X, MessageSquare, Trash2, EyeOff, Eye, Image as ImageIcon, ChevronRight } from 'lucide-react';

export default function AdminMyeongdangRequests() {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [appraisalResult, setAppraisalResult] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('myeongdang_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error('의뢰 목록 로드 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 🚨 진짜 버킷 이름(myeongdang_images) 파싱 로직 유지
    const parseImages = (urls) => {
        if (!urls) return [];
        let parsed = [];
        if (Array.isArray(urls)) {
            parsed = urls;
        } else {
            try { parsed = JSON.parse(urls); } catch (e) { return []; }
        }

        return parsed.map(url => {
            if (url.startsWith('http')) return url;
            const { data } = supabase.storage.from('myeongdang_images').getPublicUrl(url);
            return data.publicUrl;
        });
    };

    const openAppraisalModal = (req) => {
        setSelectedRequest(req);
        setAppraisalResult(req.appraisal_result || '');
    };

    const submitAppraisal = async () => {
        if (!appraisalResult.trim()) return alert('감정 소견을 입력해주세요.');
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('myeongdang_requests')
                .update({ 
                    status: 'completed', 
                    appraisal_result: appraisalResult 
                })
                .eq('id', selectedRequest.id);

            if (error) throw error;

            alert('✅ 감정 결과가 성공적으로 전송되었습니다.');
            setSelectedRequest(null);
            fetchRequests();
        } catch (error) {
            alert('결과 저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleHide = async (id, currentHiddenStatus) => {
        const confirmMsg = currentHiddenStatus 
            ? '이 의뢰를 다시 관리자 목록에 표시하시겠습니까?' 
            : '이 의뢰를 숨김 처리하시겠습니까?\n(고객에게는 결과가 계속 보이지만, 관리자 목록에서는 숨겨집니다)';
            
        if (!window.confirm(confirmMsg)) return;
        
        try {
            const { error } = await supabase.from('myeongdang_requests').update({ is_hidden: !currentHiddenStatus }).eq('id', id);
            if (error) throw error;
            fetchRequests();
        } catch (error) {
            alert('숨김 상태 변경 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말로 이 의뢰를 영구 삭제하시겠습니까?\n(데이터베이스에서 완전히 삭제되며, 고객의 화면에서도 사라집니다. 복구 불가)')) return;
        
        try {
            const { error } = await supabase.from('myeongdang_requests').delete().eq('id', id);
            if (error) throw error;
            alert('의뢰가 완전히 삭제되었습니다.');
            fetchRequests();
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="ios-req-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-req-wrap {
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
                    min-height: 60px; padding: 16px; border-bottom: 0.5px solid #E5E5EA;
                    transition: background-color 0.2s;
                }
                .ios-list-row:last-child { border-bottom: none; }

                /* 아이템 썸네일 & 텍스트 */
                .ios-req-thumb {
                    width: 60px; height: 60px; border-radius: 12px; background-color: #F2F2F7;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 16px; overflow: hidden; border: 0.5px solid #E5E5EA;
                }
                .ios-req-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
                .ios-req-title { font-size: 16px; font-weight: 600; color: #1C1C1E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 8px; }
                .ios-req-date { font-size: 13px; color: #8E8E93; font-weight: 500; }

                /* 뱃지 스타일 */
                .ios-badge {
                    display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;
                }
                .ios-badge.pending { background-color: #FFF5E5; color: #FF9500; }
                .ios-badge.completed { background-color: #E5FBEB; color: #34C759; }

                /* 액션 버튼 */
                .ios-action-group { display: flex; align-items: center; gap: 8px; }
                
                .ios-btn-main {
                    background-color: #007AFF; color: #FFFFFF; border: none; padding: 8px 16px; border-radius: 10px;
                    font-size: 14px; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px;
                }
                .ios-btn-main:active { transform: scale(0.96); opacity: 0.8; }
                .ios-btn-main.done { background-color: #F2F2F7; color: #1C1C1E; }
                
                .ios-btn-icon {
                    width: 36px; height: 36px; border-radius: 10px; border: 1px solid #E5E5EA; background-color: #FFFFFF;
                    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; color: #8E8E93;
                }
                .ios-btn-icon:active { transform: scale(0.92); background-color: #F2F2F7; }
                .ios-btn-icon.danger { color: #FF3B30; border-color: #FFE5E5; background-color: #FFF0F0; }

                /* 모달 스타일 (iOS Card) */
                .ios-modal-overlay {
                    position: fixed; inset: 0; background-color: rgba(0,0,0,0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                    z-index: 10000; display: flex; alignItems: center; justifyContent: center; padding: 20px;
                    animation: fadeIn 0.2s ease-out;
                }
                .ios-modal-card {
                    background-color: #FFFFFF; width: 100%; max-width: 600px; max-height: 90vh; border-radius: 20px;
                    display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                    animation: slideUp 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2);
                }
                
                .ios-modal-header {
                    padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 0.5px solid #E5E5EA; background-color: rgba(255,255,255,0.9);
                }
                .ios-modal-title { font-size: 17px; font-weight: 600; color: #1C1C1E; margin: 0; display: flex; align-items: center; gap: 6px; }
                .ios-modal-close { background: #F2F2F7; border: none; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #8E8E93; }
                
                .ios-modal-body { padding: 20px; overflow-y: auto; flex: 1; }
                
                .ios-req-box {
                    background-color: #F2F2F7; border-radius: 12px; padding: 16px; margin-bottom: 24px;
                }
                .ios-req-desc { font-size: 14px; color: #3A3A3C; line-height: 1.6; margin: 0 0 16px 0; white-space: pre-wrap; font-weight: 500; }
                
                .ios-img-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; }
                .ios-img-scroll::-webkit-scrollbar { display: none; }
                .ios-img-item { width: 100px; height: 100px; border-radius: 10px; object-fit: cover; border: 0.5px solid #C6C6C8; flex-shrink: 0; }
                
                .ios-textarea {
                    width: 100%; min-height: 180px; background-color: #F9F9FB; border: 1px solid #E5E5EA; border-radius: 12px;
                    padding: 16px; font-size: 15px; line-height: 1.6; color: #1C1C1E; outline: none; resize: vertical; box-sizing: border-box; font-family: inherit;
                }
                .ios-textarea:focus { border-color: #007AFF; background-color: #FFFFFF; }

                .ios-submit-modal-btn {
                    width: 100%; background-color: #34C759; color: #FFFFFF; font-size: 17px; font-weight: 600;
                    padding: 16px; border-radius: 14px; border: none; cursor: pointer; margin-top: 24px; transition: 0.2s;
                }
                .ios-submit-modal-btn:active:not(:disabled) { transform: scale(0.98); }
                .ios-submit-modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .ios-empty-state { padding: 60px 20px; text-align: center; color: #8E8E93; font-size: 15px; font-weight: 500; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}} />

            <div>
                <h1 className="ios-page-title">고객 감정 의뢰 관리</h1>
                <p className="ios-page-desc">고객이 요청한 토지/건물 풍수 감정 내역을 확인하고 결과를 발송합니다.</p>
            </div>

            <div className="ios-group-title">
                <span>접수된 의뢰 목록</span>
                <span>총 {requests.length}건</span>
            </div>

            <div className="ios-list-group">
                {isLoading ? (
                    <div className="ios-empty-state">데이터를 동기화 중입니다...</div>
                ) : requests.length === 0 ? (
                    <div className="ios-empty-state">접수된 감정 의뢰가 없습니다.</div>
                ) : (
                    requests.map((req) => {
                        const images = parseImages(req.image_urls);
                        const isCompleted = req.status === 'completed';
                        const isHidden = req.is_hidden;

                        return (
                            <div key={req.id} className="ios-list-row" style={{ backgroundColor: isHidden ? '#F9F9FB' : '#FFFFFF', opacity: isHidden ? 0.6 : 1 }}>
                                
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                    <div className="ios-req-thumb">
                                        {images.length > 0 ? (
                                            <img src={images[0]} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <ImageIcon size={24} color="#C7C7CC" />
                                        )}
                                    </div>
                                    <div className="ios-req-info">
                                        <div className="ios-req-title">
                                            {req.title}
                                            {isCompleted ? (
                                                <span className="ios-badge completed"><CheckCircle size={12}/> 감정완료</span>
                                            ) : (
                                                <span className="ios-badge pending"><Clock size={12}/> 대기중</span>
                                            )}
                                            {isHidden && <span className="ios-badge" style={{ background: '#E5E5EA', color: '#8E8E93' }}><EyeOff size={10}/> 숨김</span>}
                                        </div>
                                        <div className="ios-req-date">
                                            의뢰일: {new Date(req.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="ios-action-group">
                                    <button className={`ios-btn-main ${isCompleted ? 'done' : ''}`} onClick={() => openAppraisalModal(req)}>
                                        {isCompleted ? '결과 수정' : '감정하기'}
                                    </button>
                                    
                                    <button className="ios-btn-icon" onClick={() => handleToggleHide(req.id, isHidden)} title={isHidden ? "숨김 해제" : "목록에서 숨기기"}>
                                        {isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>

                                    <button className="ios-btn-icon danger" onClick={() => handleDelete(req.id)} title="영구 삭제">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* 🌟 iOS 카드 형태의 감정 작성 모달 */}
            {selectedRequest && (
                <div className="ios-modal-overlay" onClick={() => setSelectedRequest(null)}>
                    <div className="ios-modal-card" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="ios-modal-header">
                            <h3 className="ios-modal-title"><MessageSquare size={18} color="#007AFF" /> 감정서 작성</h3>
                            <button className="ios-modal-close" onClick={() => setSelectedRequest(null)}><X size={16} strokeWidth={2.5} /></button>
                        </div>
                        
                        <div className="ios-modal-body">
                            {/* 고객 의뢰 내용 박스 */}
                            <div className="ios-req-box">
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#1C1C1E' }}>{selectedRequest.title}</h4>
                                <p className="ios-req-desc">{selectedRequest.description}</p>
                                
                                {parseImages(selectedRequest.image_urls).length > 0 && (
                                    <>
                                        <div className="ios-img-scroll">
                                            {parseImages(selectedRequest.image_urls).map((url, idx) => (
                                                <a key={idx} href={url} target="_blank" rel="noreferrer">
                                                    <img src={url} alt="첨부" className="ios-img-item" />
                                                </a>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#8E8E93', marginTop: '6px' }}>사진을 누르면 원본 크기로 확인 가능합니다.</div>
                                    </>
                                )}
                            </div>

                            {/* 답변 입력 폼 */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1C1C1E', marginBottom: '8px' }}>
                                    태화 이상섭 전문가 감정 소견 <span style={{ color: '#007AFF', fontWeight: '500', fontSize: '12px' }}>(고객에게 발송됩니다)</span>
                                </label>
                                <textarea 
                                    className="ios-textarea"
                                    value={appraisalResult} 
                                    onChange={(e) => setAppraisalResult(e.target.value)}
                                    placeholder="분석 결과와 풍수지리적 처방을 고객이 이해하기 쉽게 상세히 적어주세요."
                                />
                            </div>

                            <button onClick={submitAppraisal} disabled={isSaving} className="ios-submit-modal-btn">
                                {isSaving ? '전송 중...' : '감정 완료 및 고객에게 전송'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}