// src/components/admin/AdminAccount.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { Save, ExternalLink, Image as ImageIcon, ShieldCheck } from 'lucide-react';

export default function AdminAccount({ adminTheme }) {
    // 폼 상태 관리
    const [domain, setDomain] = useState('bokhouse.com');
    const [adminCount, setAdminCount] = useState(0);
    const [loginExpiry, setLoginExpiry] = useState('사용안함');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // 최고관리자 수 페칭 (부가 서비스 항목용)
    useEffect(() => {
        const fetchAdminCount = async () => {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'admin');
            if (count !== null) setAdminCount(count);
        };
        fetchAdminCount();
    }, []);

    const handleLogoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 🚨 실제 운영 환경에서는 site_settings 테이블 등에 저장하는 로직이 들어갑니다.
            await new Promise(resolve => setTimeout(resolve, 800)); // 저장 시뮬레이션
            alert("✅ 계정 및 관리자모드 설정이 성공적으로 저장되었습니다.");
        } catch (error) {
            alert("❌ 설정 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================================
    // 🎨 엔터프라이즈 화이트 테마 스타일 (12~13px 고밀도)
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '24px' },
        
        sectionTitle: { fontSize: '13px', fontWeight: 'bold', color: '#111', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' },
        sectionIcon: { width: '6px', height: '6px', backgroundColor: '#0ea5e9', display: 'inline-block' },
        
        formBox: { border: '2px solid #E5E7EB', borderTop: '2px solid #333', display: 'flex', flexDirection: 'column', marginBottom: '24px' },
        formRow: { display: 'flex', borderBottom: '1px solid #E5E7EB' },
        formLabel: { width: '160px', backgroundColor: '#F9FAFB', padding: '12px 16px', fontWeight: 'bold', color: '#444', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', fontSize: '12px', flexShrink: 0 },
        formContent: { flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', flexWrap: 'wrap', color: '#555' },
        
        input: { padding: '6px 10px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', width: '100%', maxWidth: '400px' },
        select: { padding: '6px 10px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', backgroundColor: '#FFF' },
        
        submitBtn: { backgroundColor: '#0ea5e9', color: '#FFF', border: 'none', padding: '10px 40px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
        extendBtn: { border: '1px solid #CCC', background: '#FFF', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '2px' }
    };

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 */}
            <div>
                <h2 style={styles.headerTitle}>계정관리</h2>
                <p style={styles.headerSub}>[환경설정 &gt; 서비스관리 &gt; 계정관리] 메뉴에서는 도메인 주소와 호스팅 이용 기간, 홈페이지 운영상태 등을 확인할 수 있습니다.</p>
            </div>

            {/* 1. 계정 정보 섹션 */}
            <div style={styles.sectionTitle}><div style={styles.sectionIcon}></div> 계정 정보</div>
            <div style={styles.formBox}>
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>도메인</div>
                    <div style={styles.formContent}>
                        <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} style={styles.input} />
                        <span style={{ color: '#999', marginLeft: '8px' }}>현재 대표 도메인으로 사용중입니다.</span>
                    </div>
                </div>
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>시작일 ~ 만료일</div>
                    <div style={styles.formContent}>
                        2023-09-01 ~ 2026-09-01 <span style={{ color: '#0ea5e9', fontWeight: 'bold', marginLeft: '8px' }}>(사용 기간 350일 남음)</span>
                    </div>
                </div>
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>서비스 종류</div>
                    <div style={styles.formContent}>
                        FATE MASTER 프리미엄 엔터프라이즈 솔루션
                    </div>
                </div>
                <div style={{...styles.formRow, borderBottom: 'none'}}>
                    <div style={styles.formLabel}>상태</div>
                    <div style={styles.formContent}>
                        <span style={{ fontWeight: 'bold', color: '#111' }}>운영중</span>
                        <button style={styles.extendBtn}><ExternalLink size={12} /> 연장하기</button>
                    </div>
                </div>
            </div>

            {/* 2. 부가 서비스 섹션 */}
            <div style={styles.sectionTitle}><div style={styles.sectionIcon}></div> 부가 서비스</div>
            <div style={styles.formBox}>
                <div style={{...styles.formRow, borderBottom: 'none'}}>
                    <div style={styles.formLabel}>사용자(최고관리자) 수</div>
                    <div style={styles.formContent}>
                        <span style={{ fontWeight: 'bold' }}>{adminCount} 명</span>
                    </div>
                </div>
            </div>

            {/* 3. 관리자모드 설정 섹션 */}
            <div style={styles.sectionTitle}><div style={styles.sectionIcon}></div> 관리자모드 설정</div>
            <div style={styles.formBox}>
                <div style={styles.formRow}>
                    <div style={styles.formLabel}>관리자모드 로고</div>
                    <div style={styles.formContent}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Admin Logo" style={{ height: '51px', maxWidth: '200px', border: '1px solid #E5E7EB' }} />
                                ) : (
                                    <span style={{ color: '#999' }}>등록된 이미지가 없습니다.</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ ...styles.extendBtn, padding: '6px 12px', fontWeight: 'bold', color: '#444' }}>
                                    찾아보기
                                    <input type="file" accept="image/*" onChange={handleLogoSelect} style={{ display: 'none' }} />
                                </label>
                                <span style={{ color: '#999', fontSize: '11px' }}>
                                    로고 사이즈 : 200px X 51px, jpg, gif, png, bmp 파일만 등록 가능합니다.<br/>
                                    로고를 등록하지 않으시면 기본 로고가 출력되며 로고 등록 후 확인버튼을 클릭해야 적용됩니다.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{...styles.formRow, borderBottom: 'none'}}>
                    <div style={styles.formLabel}>로그인 만료 설정</div>
                    <div style={styles.formContent}>
                        <select value={loginExpiry} onChange={(e) => setLoginExpiry(e.target.value)} style={styles.select}>
                            <option value="사용안함">사용안함</option>
                            <option value="30분">30분 동안 동작 없을 시 로그아웃</option>
                            <option value="1시간">1시간 동안 동작 없을 시 로그아웃</option>
                            <option value="당일자정">당일 자정(24:00) 자동 로그아웃</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 하단 저장(확인) 버튼 */}
            <div style={{ textAlign: 'center', marginTop: '30px', paddingBottom: '40px' }}>
                <button onClick={handleSave} disabled={isSaving} style={{ ...styles.submitBtn, opacity: isSaving ? 0.6 : 1 }}>
                    <ShieldCheck size={16} /> {isSaving ? "적용 중..." : "확인 (저장)"}
                </button>
            </div>
        </div>
    );
}