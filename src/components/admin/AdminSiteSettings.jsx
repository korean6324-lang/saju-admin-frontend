// src/components/admin/AdminSiteSettings.jsx
import React, { useState, useEffect } from 'react';
import { Save, Search, Check, Upload, Layout, FileText, Users, Monitor, Loader2 } from 'lucide-react';
import { supabase } from '../../api/supabaseClient'; 

export default function AdminSiteSettings({ adminTheme }) {
    // ==========================================================
    // 1. 탭 라우팅 상태 관리 
    // ==========================================================
    const [mainTab, setMainTab] = useState('basic'); 
    const [subTab, setSubTab] = useState('info'); 
    const [isSaving, setIsSaving] = useState(false);
    
    // 🚨 파비콘 업로드 상태 추가
    const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

    // ==========================================================
    // 2. 폼 데이터 상태 관리
    // ==========================================================
    const [basicInfo, setBasicInfo] = useState({
        companyName: '(주)에프엠솔루션',
        zipCode: '13840', address1: '경기 과천시 과천대로7나길 34', address2: '5층(갈현동)',
        siteName: 'FATE MASTER', domain: 'http://bokhouse.com', ceo: '김정길', bizNum: '896-88-01674',
        mailOrderNum: '제 2026-충북제천-0000호', 
        phone1: '1588', phone2: '4259', phone3: '',
        mobile1: '010', mobile2: '1234', mobile3: '5678',
        fax1: '02', fax2: '1234', fax3: '5678',
        email: 'dream@bokhouse.com',
        siteTitle: '화복당(和福堂) - 프리미엄 운세', // 🚨 타이틀 문구
        faviconUrl: '', // 🚨 파비콘 URL 추가
    });

    const [policies, setPolicies] = useState({
        termsYear: '2026', termsMonth: '01', termsDay: '01', termsContent: '제 1 장 : 총칙\n제 2 장 : 서비스 이용계약\n...',
        privacyYear: '2026', privacyMonth: '01', privacyDay: '01', privacyContent: '개인정보처리방침 내용...',
        privacyManager: '관리자', privacyManagerPos: '팀장', privacyManagerPhone: '010-1234-5678', privacyManagerEmail: 'admin@bokhouse.com',
        emailRejectYear: '2026', emailRejectMonth: '01', emailRejectDay: '01',
        emailRejectContent: '본 웹사이트에 게시된 이메일 주소가 무단 수집되는 것을 거부합니다.',
        operationContent: '화복당 운영정책을 입력하세요.' 
    });

    const [joinFields, setJoinFields] = useState([
        { id: 'id', name: '아이디', use: true, required: true, fixed: true },
        { id: 'password', name: '비밀번호', use: true, required: true, fixed: true },
        { id: 'name', name: '이름', use: true, required: true, fixed: true },
        { id: 'nickname', name: '닉네임', use: true, required: false, fixed: false },
        { id: 'email', name: '이메일', use: true, required: true, fixed: false },
        { id: 'phone', name: '휴대폰', use: true, required: false, fixed: false },
        { id: 'address', name: '주소', use: false, required: false, fixed: false },
    ]);

    // ==========================================================
    // 🚀 DB 데이터 불러오기 (타이틀, 파비콘 추가)
    // ==========================================================
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
            if (data) {
                const phones = (data.main_phone || '1588-4259-').split('-');
                const mobiles = (data.mobile_phone || '010-1234-5678').split('-');
                
                setBasicInfo(prev => ({
                    ...prev,
                    companyName: data.company_name || prev.companyName,
                    zipCode: data.zip_code || prev.zipCode,
                    address1: data.address || prev.address1,
                    address2: data.address_detail || prev.address2,
                    siteName: data.site_name || prev.siteName,
                    domain: data.domain || prev.domain,
                    ceo: data.ceo_name || prev.ceo,
                    bizNum: data.business_number || prev.bizNum,
                    mailOrderNum: data.mail_order_number || prev.mailOrderNum,
                    phone1: phones[0] || '1588', phone2: phones[1] || '4259', phone3: phones[2] || '',
                    mobile1: mobiles[0] || '010', mobile2: mobiles[1] || '1234', mobile3: mobiles[2] || '5678',
                    email: data.email || prev.email,
                    siteTitle: data.site_title || prev.siteTitle, // 🚨 타이틀 반영
                    faviconUrl: data.favicon_url || prev.faviconUrl // 🚨 파비콘 반영
                }));
                
                setPolicies(prev => ({
                    ...prev,
                    termsContent: data.terms_of_service || prev.termsContent,
                    privacyContent: data.privacy_policy || prev.privacyContent,
                    emailRejectContent: data.email_reject_policy || prev.emailRejectContent,
                    operationContent: data.operation_policy || prev.operationContent, 
                }));
            }
        } catch (error) {
            console.error("초기 설정 로드 실패:", error);
        }
    };

    // ==========================================================
    // 3. 핸들러
    // ==========================================================
    const handleBasicChange = (e) => setBasicInfo({ ...basicInfo, [e.target.name]: e.target.value });
    const handlePolicyChange = (e) => setPolicies({ ...policies, [e.target.name]: e.target.value });
    const handleFieldToggle = (id, key) => {
        setJoinFields(fields => fields.map(f => {
            if (f.id === id && !f.fixed) return { ...f, [key]: !f[key] };
            return f;
        }));
    };

    // 🚨 파비콘 이미지 업로드 함수
    const handleFaviconUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingFavicon(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `favicon_${Date.now()}.${fileExt}`;
            const filePath = `settings/${fileName}`;

            // creator_files 버킷 사용 (안전장치)
            const { error: uploadError } = await supabase.storage.from('creator_files').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('creator_files').getPublicUrl(filePath);

            // 업로드 완료 시 화면에 미리보기 바로 적용
            setBasicInfo(prev => ({ ...prev, faviconUrl: publicUrlData.publicUrl }));
            alert('파비콘 이미지가 임시 업로드 되었습니다.\n반드시 하단의 [확인 (설정 저장)] 버튼을 눌러야 최종 반영됩니다.');
        } catch (error) {
            console.error('파비콘 업로드 오류:', error);
            alert('파비콘 업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploadingFavicon(false);
            e.target.value = null; // 인풋 초기화
        }
    };

    // 🚀 DB에 실제 데이터 저장하기 (타이틀, 파비콘 추가)
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const main_phone = `${basicInfo.phone1}-${basicInfo.phone2}-${basicInfo.phone3}`;
            const mobile_phone = `${basicInfo.mobile1}-${basicInfo.mobile2}-${basicInfo.mobile3}`;

            const { error } = await supabase.from('site_settings').upsert({
                id: 1, 
                company_name: basicInfo.companyName,
                zip_code: basicInfo.zipCode,
                address: basicInfo.address1,
                address_detail: basicInfo.address2,
                site_name: basicInfo.siteName,
                domain: basicInfo.domain,
                ceo_name: basicInfo.ceo,
                business_number: basicInfo.bizNum,
                mail_order_number: basicInfo.mailOrderNum, 
                main_phone: main_phone,
                mobile_phone: mobile_phone,
                email: basicInfo.email,
                site_title: basicInfo.siteTitle, // 🚨 타이틀 DB 저장
                favicon_url: basicInfo.faviconUrl, // 🚨 파비콘 DB 저장
                terms_of_service: policies.termsContent,
                privacy_policy: policies.privacyContent,
                email_reject_policy: policies.emailRejectContent, 
                operation_policy: policies.operationContent, 
                updated_at: new Date()
            });

            if (error) throw error;
            alert("✅ 설정이 성공적으로 저장되었습니다.\n(고객 페이지에 즉각 반영됩니다.)");
        } catch (e) {
            console.error(e);
            alert("❌ 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================================
    // 🎨 스타일 
    // ==========================================================
    const styles = {
        container: { backgroundColor: '#FFFFFF', padding: '24px', fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', fontSize: '13px', color: '#333' },
        headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' },
        headerSub: { fontSize: '12px', color: '#666', marginBottom: '24px' },
        
        mainTabContainer: { display: 'flex', borderBottom: '2px solid #1E3A8A', marginBottom: '16px' },
        mainTab: (isActive) => ({ padding: '12px 24px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', backgroundColor: isActive ? '#1E3A8A' : '#F9FAFB', color: isActive ? '#FFF' : '#555', border: `1px solid ${isActive ? '#1E3A8A' : '#E5E7EB'}`, borderBottom: 'none', display: 'flex', alignItems: 'center', gap: '6px' }),
        
        subTabContainer: { display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' },
        subTab: (isActive) => ({ padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${isActive ? '#ef4444' : '#E5E7EB'}`, backgroundColor: isActive ? '#FFF' : '#F9FAFB', color: isActive ? '#ef4444' : '#555' }),
        
        formBox: { border: '2px solid #E5E7EB', borderTop: '2px solid #ef4444', display: 'flex', flexDirection: 'column', marginBottom: '24px' },
        formRow: { display: 'flex', borderBottom: '1px solid #E5E7EB' },
        formLabel: { width: '160px', backgroundColor: '#F9FAFB', padding: '10px 16px', fontWeight: 'bold', color: '#444', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', fontSize: '12px', flexShrink: 0 },
        formContent: { flex: 1, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', flexWrap: 'wrap', color: '#555' },
        
        input: { padding: '4px 8px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', width: '100%', maxWidth: '300px' },
        select: { padding: '4px 8px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', backgroundColor: '#FFF' },
        
        btnBlue: { backgroundColor: '#0ea5e9', color: '#FFF', border: 'none', padding: '8px 40px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
        btnOutline: { border: '1px solid #CCC', background: '#FFF', padding: '4px 12px', fontSize: '11px', cursor: 'pointer', color: '#333', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' },
        
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '12px' },
        tableCell: { padding: '8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
    };

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 */}
            <div>
                <h2 style={styles.headerTitle}>사이트 관리 및 정책 설정</h2>
                <p style={styles.headerSub}>[환경설정 &gt; 사이트관리] 메뉴에서는 홈페이지 기본정보를 확인하고, 이용약관 및 개인정보 취급방침 등을 설정할 수 있습니다.</p>
            </div>

            {/* 1차 메인 탭 */}
            <div style={styles.mainTabContainer}>
                <div style={styles.mainTab(mainTab === 'basic')} onClick={() => { setMainTab('basic'); setSubTab('info'); }}><Layout size={16}/> 기본정보</div>
                <div style={styles.mainTab(mainTab === 'policy')} onClick={() => { setMainTab('policy'); setSubTab('terms'); }}><FileText size={16}/> 운영정책</div>
                <div style={styles.mainTab(mainTab === 'member')} onClick={() => { setMainTab('member'); setSubTab('join'); }}><Users size={16}/> 회원정책</div>
            </div>

            {/* ========================================================== */}
            {/* 탭 1: 기본정보 영역 */}
            {/* ========================================================== */}
            {mainTab === 'basic' && (
                <>
                    <div style={styles.subTabContainer}>
                        <div style={styles.subTab(subTab === 'info')} onClick={() => setSubTab('info')}>기본정보</div>
                        <div style={styles.subTab(subTab === 'favicon')} onClick={() => setSubTab('favicon')}>타이틀/파비콘</div>
                    </div>

                    {subTab === 'info' && (
                        <div style={styles.formBox}>
                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>회사명</div>
                                <div style={styles.formContent}>
                                    <input type="text" name="companyName" value={basicInfo.companyName} onChange={handleBasicChange} style={styles.input} />
                                    <span style={{color:'#999', fontSize:'11px', marginLeft:'8px'}}>사이트명은 홈페이지 및 자동메일 등에서 변수로 사용됩니다.</span>
                                </div>
                            </div>
                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>회사 주소</div>
                                <div style={styles.formContent}>
                                    <input type="text" name="zipCode" value={basicInfo.zipCode} onChange={handleBasicChange} style={{...styles.input, width:'80px'}} />
                                    <button style={styles.btnOutline}><Search size={10}/> 우편번호찾기</button>
                                    <div style={{width:'100%', height:'4px'}}></div>
                                    <input type="text" name="address1" value={basicInfo.address1} onChange={handleBasicChange} style={{...styles.input, maxWidth:'400px'}} />
                                    <input type="text" name="address2" value={basicInfo.address2} onChange={handleBasicChange} style={{...styles.input, maxWidth:'200px'}} />
                                </div>
                            </div>
                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>사이트명</div>
                                <div style={styles.formContent}><input type="text" name="siteName" value={basicInfo.siteName} onChange={handleBasicChange} style={styles.input} /></div>
                            </div>
                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>대표 도메인</div>
                                <div style={styles.formContent}><input type="text" name="domain" value={basicInfo.domain} onChange={handleBasicChange} style={styles.input} /></div>
                            </div>
                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>대표자명</div>
                                <div style={styles.formContent}><input type="text" name="ceo" value={basicInfo.ceo} onChange={handleBasicChange} style={{...styles.input, maxWidth:'150px'}} /></div>
                            </div>
                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>사업자 등록번호</div>
                                <div style={styles.formContent}><input type="text" name="bizNum" value={basicInfo.bizNum} onChange={handleBasicChange} style={{...styles.input, maxWidth:'200px'}} /></div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>통신판매업 신고번호</div>
                                <div style={styles.formContent}>
                                    <input type="text" name="mailOrderNum" value={basicInfo.mailOrderNum} onChange={handleBasicChange} style={{...styles.input, maxWidth:'250px'}} placeholder="제 2026-충북제천-0000호" />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>대표전화</div>
                                <div style={styles.formContent}>
                                    <select name="phone1" value={basicInfo.phone1} onChange={handleBasicChange} style={styles.select}><option>1588</option><option>02</option></select> - 
                                    <input type="text" name="phone2" value={basicInfo.phone2} onChange={handleBasicChange} style={{...styles.input, width:'60px'}} /> - 
                                    <input type="text" name="phone3" value={basicInfo.phone3} onChange={handleBasicChange} style={{...styles.input, width:'60px'}} />
                                    <span style={{color:'#999', fontSize:'11px', marginLeft:'8px'}}>한국대표번호는 앞뒤 두자리만 입력하세요.</span>
                                </div>
                            </div>
                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>휴대폰</div>
                                <div style={styles.formContent}>
                                    <select name="mobile1" value={basicInfo.mobile1} onChange={handleBasicChange} style={styles.select}><option>010</option></select> - 
                                    <input type="text" name="mobile2" value={basicInfo.mobile2} onChange={handleBasicChange} style={{...styles.input, width:'60px'}} /> - 
                                    <input type="text" name="mobile3" value={basicInfo.mobile3} onChange={handleBasicChange} style={{...styles.input, width:'60px'}} />
                                </div>
                            </div>
                            <div style={{...styles.formRow, borderBottom:'none'}}>
                                <div style={styles.formLabel}>사이트 이메일</div>
                                <div style={styles.formContent}>
                                    <input type="text" name="email" value={basicInfo.email} onChange={handleBasicChange} style={styles.input} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🚨 파비콘/타이틀 업로드 및 미리보기 영역 완성 */}
                    {subTab === 'favicon' && (
                        <div style={styles.formBox}>
                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>타이틀 문구</div>
                                <div style={styles.formContent}>
                                    <input type="text" name="siteTitle" value={basicInfo.siteTitle} onChange={handleBasicChange} style={{...styles.input, maxWidth:'400px'}} />
                                    <span style={{color:'#999', fontSize:'11px', marginLeft:'8px'}}>브라우저 탭 상단에 표시되는 제목입니다.</span>
                                </div>
                            </div>
                            <div style={{...styles.formRow, borderBottom:'none'}}>
                                <div style={styles.formLabel}>파비콘(Favicon)</div>
                                <div style={styles.formContent}>
                                    <input 
                                        type="file" 
                                        id="favicon-upload" 
                                        accept=".ico,.png,.jpg" 
                                        style={{ display: 'none' }} 
                                        onChange={handleFaviconUpload} 
                                    />
                                    <label htmlFor="favicon-upload" style={styles.btnOutline}>
                                        {isUploadingFavicon ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                        {isUploadingFavicon ? '업로드 중...' : '찾아보기'}
                                    </label>
                                    
                                    {basicInfo.faviconUrl && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', padding: '4px', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#FFF' }}>
                                            <img src={basicInfo.faviconUrl} alt="파비콘 미리보기" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                            <button onClick={() => setBasicInfo(prev => ({...prev, faviconUrl: ''}))} style={{ background:'none', border:'none', color:'#ef4444', fontSize:'11px', cursor:'pointer', padding: 0 }}>삭제</button>
                                        </div>
                                    )}
                                    <span style={{color:'#999', fontSize:'11px', marginLeft:'8px'}}>브라우저 탭 상단에 표시되는 작은 아이콘입니다. (16x16픽셀 권장)</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ========================================================== */}
            {/* 탭 2: 운영정책 영역 (약관 및 방침) */}
            {/* ========================================================== */}
            {mainTab === 'policy' && (
                <>
                    <div style={styles.subTabContainer}>
                        <div style={styles.subTab(subTab === 'terms')} onClick={() => setSubTab('terms')}>이용약관</div>
                        <div style={styles.subTab(subTab === 'privacy')} onClick={() => setSubTab('privacy')}>개인정보취급방침</div>
                        <div style={styles.subTab(subTab === 'emailReject')} onClick={() => setSubTab('emailReject')}>이메일주소무단수집거부</div>
                        <div style={styles.subTab(subTab === 'operation')} onClick={() => setSubTab('operation')}>운영정책</div>
                    </div>

                    <div style={styles.formBox}>
                        {(subTab === 'terms' || subTab === 'privacy' || subTab === 'emailReject' || subTab === 'operation') && (
                            <div style={styles.formRow}>
                                <div style={styles.formLabel}>시행일</div>
                                <div style={styles.formContent}>
                                    <select style={styles.select}><option>2026</option></select> 년
                                    <select style={styles.select}><option>01</option></select> 월
                                    <select style={styles.select}><option>01</option></select> 일
                                    <span style={{color:'#999', fontSize:'11px', marginLeft:'8px'}}>홈페이지 하단에 적용됩니다.</span>
                                </div>
                            </div>
                        )}
                        
                        {subTab === 'privacy' && (
                            <>
                                <div style={styles.formRow}>
                                    <div style={styles.formLabel}>개인정보 관리책임자</div>
                                    <div style={{...styles.formContent, flexDirection:'column', alignItems:'flex-start'}}>
                                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                            <span style={{width:'60px'}}>소속/직위:</span>
                                            <input type="text" value={policies.privacyManager} style={{...styles.input, width:'100px'}} readOnly />
                                            <input type="text" value={policies.privacyManagerPos} style={{...styles.input, width:'100px'}} readOnly />
                                        </div>
                                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                            <span style={{width:'60px'}}>연락처:</span>
                                            <input type="text" value={policies.privacyManagerPhone} style={styles.input} readOnly />
                                        </div>
                                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                            <span style={{width:'60px'}}>이메일:</span>
                                            <input type="text" value={policies.privacyManagerEmail} style={styles.input} readOnly />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div style={{...styles.formRow, borderBottom:'none'}}>
                            <div style={styles.formLabel}>내용 편집기</div>
                            <div style={{...styles.formContent, padding:'16px'}}>
                                <div style={{width:'100%', border:'1px solid #CCC', borderRadius:'2px', overflow:'hidden'}}>
                                    <div style={{backgroundColor:'#F3F4F6', borderBottom:'1px solid #CCC', padding:'4px 8px', display:'flex', gap:'4px'}}>
                                        <button style={styles.btnOutline}>B</button>
                                        <button style={styles.btnOutline}>I</button>
                                        <button style={styles.btnOutline}>U</button>
                                        <span style={{borderLeft:'1px solid #CCC', margin:'0 4px'}}></span>
                                        <select style={styles.select}><option>10pt</option><option>12pt</option></select>
                                    </div>
                                    
                                    <textarea 
                                        name={
                                            subTab === 'terms' ? 'termsContent' : 
                                            subTab === 'privacy' ? 'privacyContent' : 
                                            subTab === 'emailReject' ? 'emailRejectContent' : 
                                            'operationContent'
                                        }
                                        style={{width:'100%', height:'300px', padding:'16px', border:'none', outline:'none', resize:'vertical', fontSize:'12px', lineHeight:'1.6'}}
                                        value={
                                            subTab === 'terms' ? policies.termsContent : 
                                            subTab === 'privacy' ? policies.privacyContent : 
                                            subTab === 'emailReject' ? policies.emailRejectContent : 
                                            policies.operationContent
                                        }
                                        onChange={handlePolicyChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ========================================================== */}
            {/* 탭 3: 회원정책 (가입항목 설정) */}
            {/* ========================================================== */}
            {mainTab === 'member' && (
                <>
                    <div style={styles.subTabContainer}>
                        <div style={styles.subTab(subTab === 'join')} onClick={() => setSubTab('join')}>가입항목 설정</div>
                        <div style={styles.subTab(subTab === 'approve')} onClick={() => setSubTab('approve')}>운영/승인 방식</div>
                    </div>

                    {subTab === 'approve' && (
                        <div style={styles.formBox}>
                            <div style={{...styles.formRow, borderBottom:'none'}}>
                                <div style={styles.formLabel}>가입 승인 방식</div>
                                <div style={styles.formContent}>
                                    <label style={{display:'flex', alignItems:'center', gap:'4px'}}><input type="radio" name="approve" defaultChecked/> 자동 승인 (가입 즉시 이용가능)</label>
                                    <span style={{margin:'0 8px', color:'#CCC'}}>|</span>
                                    <label style={{display:'flex', alignItems:'center', gap:'4px'}}><input type="radio" name="approve" /> 관리자 수동 승인 (승인 대기)</label>
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'join' && (
                        <div style={{ border: '2px solid #E5E7EB', borderTop: '2px solid #ef4444', backgroundColor: '#FFF' }}>
                            <div style={{ padding: '12px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', color: '#666' }}>
                                회원가입 시 노출할 입력 항목과 필수 여부를 설정합니다. (회색 처리된 항목은 시스템 필수 항목으로 변경이 불가합니다.)
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>항목명</th>
                                        <th style={{...styles.tableHeader, width:'100px'}}>사용여부</th>
                                        <th style={{...styles.tableHeader, width:'100px'}}>필수여부</th>
                                        <th style={{...styles.tableHeader, width:'120px'}}>관리</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {joinFields.map(field => (
                                        <tr key={field.id} style={{ backgroundColor: field.fixed ? '#F9FAFB' : '#FFF' }}>
                                            <td style={{...styles.tableCell, fontWeight:'bold', color:'#111'}}>{field.name}</td>
                                            <td style={styles.tableCell}>
                                                <input type="checkbox" checked={field.use} disabled={field.fixed} onChange={() => handleFieldToggle(field.id, 'use')} />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <input type="checkbox" checked={field.required} disabled={field.fixed} onChange={() => handleFieldToggle(field.id, 'required')} />
                                            </td>
                                            <td style={styles.tableCell}>
                                                {field.fixed ? <span style={{fontSize:'11px', color:'#999'}}>시스템 고정</span> : <button style={styles.btnOutline}>설정</button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* 하단 저장 버튼 */}
            <div style={{ textAlign: 'center', marginTop: '30px', paddingBottom: '40px' }}>
                <button onClick={handleSave} disabled={isSaving} style={{ ...styles.btnBlue, opacity: isSaving ? 0.6 : 1 }}>
                    <Check size={16} /> {isSaving ? "데이터 반영 중..." : "확인 (설정 저장)"}
                </button>
            </div>
        </div>
    );
}