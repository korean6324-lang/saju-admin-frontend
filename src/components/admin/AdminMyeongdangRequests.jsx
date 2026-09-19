// src/components/admin/AdminMyeongdangRequests.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { MapPin, CheckCircle, Clock, X, Save, MessageSquare } from 'lucide-react';

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

    const parseImages = (urls) => {
        if (!urls) return [];
        if (Array.isArray(urls)) return urls;
        try { return JSON.parse(urls); } catch (e) { return []; }
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

    // 화이트 톤 엔터프라이즈 디자인
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333', minHeight: '100vh' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '24px' },
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '12px' },
        tableCell: { padding: '10px 8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
    };

    return (
        <div style={styles.container}>
            <div>
                <h2 style={styles.headerTitle}>고객 감정 의뢰 관리</h2>
                <p style={styles.headerSub}>[콘텐츠 관리 &gt; 감정 의뢰 관리] 고객이 요청한 토지/건물 풍수 감정 내역을 확인하고 결과를 발송합니다.</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #333' }}>
                <thead>
                    <tr>
                        <th style={{...styles.tableHeader, width: '60px'}}>번호</th>
                        <th style={{...styles.tableHeader, width: '120px'}}>첨부 썸네일</th>
                        <th style={{...styles.tableHeader, textAlign: 'left', paddingLeft: '16px'}}>의뢰 제목</th>
                        <th style={{...styles.tableHeader, width: '120px'}}>의뢰 일자</th>
                        <th style={{...styles.tableHeader, width: '100px'}}>상태</th>
                        <th style={{...styles.tableHeader, width: '100px'}}>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>데이터를 불러오는 중입니다...</td></tr>
                    ) : requests.length === 0 ? (
                        <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>접수된 의뢰가 없습니다.</td></tr>
                    ) : (
                        requests.map((req, idx) => {
                            const images = parseImages(req.image_urls);
                            const isCompleted = req.status === 'completed';
                            return (
                                <tr key={req.id} style={{ backgroundColor: '#FFF' }}>
                                    <td style={styles.tableCell}>{requests.length - idx}</td>
                                    <td style={styles.tableCell}>
                                        <div style={{ width: '60px', height: '40px', backgroundColor: '#EEE', margin: '0 auto', overflow: 'hidden', border: '1px solid #DDD' }}>
                                            {images.length > 0 ? <img src={images[0]} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'NO IMG'}
                                        </div>
                                    </td>
                                    <td style={{...styles.tableCell, textAlign: 'left', paddingLeft: '16px', fontWeight: 'bold'}}>
                                        {req.title}
                                    </td>
                                    <td style={styles.tableCell}>{new Date(req.created_at).toLocaleDateString()}</td>
                                    <td style={styles.tableCell}>
                                        {isCompleted ? (
                                            <span style={{ color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><CheckCircle size={14}/> 감정완료</span>
                                        ) : (
                                            <span style={{ color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Clock size={14}/> 대기중</span>
                                        )}
                                    </td>
                                    <td style={styles.tableCell}>
                                        <button onClick={() => openAppraisalModal(req)} style={{ padding: '6px 12px', backgroundColor: isCompleted ? '#FFF' : '#0ea5e9', border: isCompleted ? '1px solid #CCC' : 'none', color: isCompleted ? '#333' : '#FFF', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                                            {isCompleted ? '결과 수정' : '감정하기'}
                                        </button>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>

            {/* 감정 작성 모달 */}
            {selectedRequest && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: '#FFF', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}><MessageSquare size={18} style={{verticalAlign:'middle', marginRight:'6px'}}/>의뢰 상세 및 감정서 작성</h3>
                            <button onClick={() => setSelectedRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#666"/></button>
                        </div>
                        
                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '4px' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#111', fontSize: '15px' }}>{selectedRequest.title}</h4>
                                <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}>{selectedRequest.description}</p>
                                
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                    {parseImages(selectedRequest.image_urls).map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noreferrer">
                                            <img src={url} alt="첨부" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #DDD' }} />
                                        </a>
                                    ))}
                                </div>
                                <span style={{ fontSize: '11px', color: '#888' }}>* 사진을 클릭하면 원본 크기로 새 창에서 열립니다.</span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#111', fontSize: '14px' }}>태화 이상섭 전문가 감정 소견 (고객에게 발송됩니다)</label>
                                <textarea 
                                    value={appraisalResult} 
                                    onChange={(e) => setAppraisalResult(e.target.value)}
                                    placeholder="분석 결과와 풍수지리적 처방을 상세히 적어주세요."
                                    style={{ width: '100%', minHeight: '200px', padding: '16px', border: '1px solid #CCC', borderRadius: '4px', fontSize: '14px', lineHeight: '1.6', boxSizing: 'border-box', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ marginTop: '24px', textAlign: 'center' }}>
                                <button onClick={submitAppraisal} disabled={isSaving} style={{ padding: '12px 32px', backgroundColor: '#10B981', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                                    {isSaving ? '전송 중...' : '감정 완료 및 고객에게 결과 전송'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}