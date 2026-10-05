// src/components/admin/AdminSiteSettings.jsx
import React, { useState, useEffect } from 'react';
import { Save, Search, Check, Upload, Layout, FileText, Users, Loader2, Image as ImageIcon, Shield, Mail, Phone, Settings, X } from 'lucide-react';
import { supabase } from '../../api/supabaseClient'; 

export default function AdminSiteSettings({ adminTheme }) {
    const [mainTab, setMainTab] = useState('basic'); 
    const [subTab, setSubTab] = useState('info'); 
    const [isSaving, setIsSaving] = useState(false);
    
    const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

    const [basicInfo, setBasicInfo] = useState({
        companyName: '(주)에프엠솔루션',
        zipCode: '13840', address1: '경기 과천시 과천대로7나길 34', address2: '5층(갈현동)',
        siteName: 'FATE MASTER', domain: 'http://bokhouse.com', ceo: '김정길', bizNum: '896-88-01674',
        mailOrderNum: '제 2026-충북제천-0000호', 
        phone1: '1588', phone2: '4259', phone3: '',
        mobile1: '010', mobile2: '1234', mobile3: '5678',
        fax1: '02', fax2: '1234', fax3: '5678',
        email: 'dream@bokhouse.com',
        siteTitle: '화복당(和福堂) - 프리미엄 운세', 
        faviconUrl: '', 
        // 🚨 계좌 및 지갑 설정 상태
        depositType: 'bank', // 'bank' | 'wallet'
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        walletAddress: ''
    });

    const [policies, setPolicies] = useState({
        termsYear: '2026', termsMonth: '01', termsDay: '01', termsContent: '제 1 장 : 총칙\n...',
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

    const [approveMethod, setApproveMethod] = useState('auto');

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
                    siteTitle: data.site_title || prev.siteTitle, 
                    faviconUrl: data.favicon_url || prev.faviconUrl,
                    // 🚨 DB에서 입금방식 및 지갑 정보 불러오기
                    depositType: data.deposit_type || 'bank',
                    bankName: data.bank_name || prev.bankName,
                    accountNumber: data.account_number || prev.accountNumber,
                    accountHolder: data.account_holder || prev.accountHolder,
                    walletAddress: data.wallet_address || prev.walletAddress
                }));
                
                setPolicies(prev => ({
                    ...prev,
                    termsContent: data.terms_of_service || prev.termsContent,
                    privacyContent: data.privacy_policy || prev.privacyContent,
                    emailRejectContent: data.email_reject_policy || prev.emailRejectContent,
                    operationContent: data.operation_policy || prev.operationContent, 
                }));
            }
        } catch (error) { console.error("초기 설정 로드 실패:", error); }
    };

    const handleBasicChange = (e) => setBasicInfo({ ...basicInfo, [e.target.name]: e.target.value });
    const handlePolicyChange = (e) => setPolicies({ ...policies, [e.target.name]: e.target.value });
    const handleFieldToggle = (id, key) => {
        setJoinFields(fields => fields.map(f => {
            if (f.id === id && !f.fixed) return { ...f, [key]: !f[key] };
            return f;
        }));
    };

    const handleFaviconUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingFavicon(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `favicon_${Date.now()}.${fileExt}`;
            const filePath = `settings/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('creator_files').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('creator_files').getPublicUrl(filePath);

            setBasicInfo(prev => ({ ...prev, faviconUrl: publicUrlData.publicUrl }));
            alert('파비콘 임시 업로드 완료.\n하단의 [확인 (설정 저장)] 버튼을 눌러야 최종 반영됩니다.');
        } catch (error) { alert('파비콘 업로드 중 오류가 발생했습니다.'); } 
        finally { setIsUploadingFavicon(false); e.target.value = null; }
    };

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
                site_title: basicInfo.siteTitle, 
                favicon_url: basicInfo.faviconUrl,
                // 🚨 입금방식 및 지갑 정보 DB 저장
                deposit_type: basicInfo.depositType,
                bank_name: basicInfo.bankName,
                account_number: basicInfo.accountNumber,
                account_holder: basicInfo.accountHolder,
                wallet_address: basicInfo.walletAddress,
                terms_of_service: policies.termsContent,
                privacy_policy: policies.privacyContent,
                email_reject_policy: policies.emailRejectContent, 
                operation_policy: policies.operationContent, 
                updated_at: new Date()
            });

            if (error) throw error;
            alert("✅ 설정이 성공적으로 저장되었습니다.");
        } catch (e) { alert("❌ 저장 중 오류가 발생했습니다."); } 
        finally { setIsSaving(false); }
    };

    return (
        <div className="ios-settings-wrap fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
                .ios-settings-wrap { width: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif; background-color: transparent; }
                .ios-title { font-size: 22px; font-weight: 800; color: #1C1C1E; margin: 0 0 6px 0; letter-spacing: -0.5px; }
                .ios-desc { font-size: 12px; color: #8E8E93; margin: 0 0 24px 0; font-weight: 500; }
                .ios-segment-main { display: inline-flex; background-color: #E5E5EA; border-radius: 10px; padding: 3px; margin-bottom: 24px; }
                .ios-segment-main-btn { padding: 8px 18px; font-size: 13px; font-weight: 700; color: #8E8E93; border-radius: 8px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px; }
                .ios-segment-main-btn.active { background-color: #FFFFFF; color: #1C1C1E; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
                .ios-segment-sub { display: inline-flex; background-color: transparent; border-bottom: 0.5px solid #E5E5EA; margin-bottom: 20px; width: 100%; }
                .ios-segment-sub-btn { padding: 10px 16px; font-size: 13px; font-weight: 600; color: #8E8E93; cursor: pointer; transition: 0.2s; border-bottom: 2px solid transparent; margin-bottom: -1px; }
                .ios-segment-sub-btn.active { color: #007AFF; border-bottom-color: #007AFF; }
                .ios-group-title { font-size: 12px; font-weight: 600; color: #8E8E93; text-transform: uppercase; margin: 0 0 6px 16px; letter-spacing: -0.2px; }
                .ios-list-group { background-color: #FFFFFF; border-radius: 12px; margin-bottom: 32px; overflow: hidden; border: 0.5px solid #E5E5EA; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
                .ios-list-row { display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 12px 16px; border-bottom: 0.5px solid #E5E5EA; }
                .ios-list-row:last-child { border-bottom: none; }
                .ios-label { font-size: 13px; font-weight: 600; color: #1C1C1E; flex-shrink: 0; width: 130px; }
                .ios-value-wrap { display: flex; align-items: center; justify-content: flex-end; flex: 1; min-width: 0; gap: 8px; flex-wrap: wrap; }
                .ios-input-clean { flex: 1; min-width: 100px; max-width: 280px; border: none; outline: none; text-align: right; font-size: 13px; color: #007AFF; font-family: inherit; background: transparent; font-weight: 500; }
                .ios-input-clean::placeholder { color: #C7C7CC; font-weight: 400; }
                .ios-select-clean { border: none; outline: none; background: transparent; text-align: right; direction: rtl; font-size: 13px; color: #007AFF; font-weight: 500; -webkit-appearance: none; appearance: none; font-family: inherit; cursor: pointer; padding: 0 4px; }
                .ios-hint { font-size: 11px; color: #8E8E93; font-weight: 500; width: 100%; text-align: right; margin-top: 4px; display: block; }
                .ios-btn-micro { border: none; background: #F2F2F7; color: #007AFF; font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; }
                .ios-btn-micro:active { transform: scale(0.95); opacity: 0.8; }
                .ios-btn-micro.danger { color: #FF3B30; background: #FFE5E5; }
                .ios-btn-micro.outline { background: transparent; border: 1px solid #E5E5EA; color: #1C1C1E; }
                .ios-submit-btn { width: 100%; background-color: #007AFF; color: #FFFFFF; font-size: 16px; font-weight: 700; padding: 16px; border-radius: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.2s, opacity 0.2s; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2); margin-top: 16px; }
                .ios-submit-btn:active:not(:disabled) { transform: scale(0.98); opacity: 0.9; }
                .ios-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
                .ios-textarea-box { width: 100%; border: 1px solid #E5E5EA; border-radius: 10px; overflow: hidden; background: #F9F9FB; }
                .ios-textarea { width: 100%; height: 300px; padding: 16px; border: none; outline: none; background: transparent; font-size: 13px; line-height: 1.6; color: #1C1C1E; resize: vertical; box-sizing: border-box; font-family: inherit; }
                .ios-toggle { width: 42px; height: 24px; background-color: #E9E9EA; border-radius: 24px; position: relative; cursor: pointer; transition: 0.3s ease; flex-shrink: 0; }
                .ios-toggle.active { background-color: #34C759; }
                .ios-toggle-knob { width: 20px; height: 20px; background-color: #FFFFFF; border-radius: 50%; position: absolute; top: 2px; left: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); transition: 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2); }
                .ios-toggle.active .ios-toggle-knob { transform: translateX(18px); }
                .ios-table { width: 100%; border-collapse: collapse; }
                .ios-th { background-color: #F9F9FB; padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #8E8E93; border-bottom: 0.5px solid #E5E5EA; }
                .ios-td { padding: 12px 16px; border-bottom: 0.5px solid #E5E5EA; font-size: 13px; color: #1C1C1E; font-weight: 500; vertical-align: middle; }
                .ios-tr:last-child .ios-td { border-bottom: none; }
                .lucide-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />

            <div>
                <h2 className="ios-title">사이트 관리 및 정책 설정</h2>
                <p className="ios-desc">홈페이지 기본정보, 이용약관, 회원가입 정책 등을 일괄 관리합니다.</p>
            </div>

            <div className="ios-segment-main">
                <div className={`ios-segment-main-btn ${mainTab === 'basic' ? 'active' : ''}`} onClick={() => { setMainTab('basic'); setSubTab('info'); }}><Layout size={14}/> 기본정보</div>
                <div className={`ios-segment-main-btn ${mainTab === 'policy' ? 'active' : ''}`} onClick={() => { setMainTab('policy'); setSubTab('terms'); }}><FileText size={14}/> 운영정책</div>
                <div className={`ios-segment-main-btn ${mainTab === 'member' ? 'active' : ''}`} onClick={() => { setMainTab('member'); setSubTab('join'); }}><Users size={14}/> 회원정책</div>
            </div>

            {mainTab === 'basic' && (
                <div className="fade-in">
                    <div className="ios-segment-sub">
                        <div className={`ios-segment-sub-btn ${subTab === 'info' ? 'active' : ''}`} onClick={() => setSubTab('info')}>사업자 정보</div>
                        <div className={`ios-segment-sub-btn ${subTab === 'favicon' ? 'active' : ''}`} onClick={() => setSubTab('favicon')}>타이틀/파비콘 설정</div>
                    </div>

                    {subTab === 'info' && (
                        <>
                            <div className="ios-group-title">기업 기본 정보</div>
                            <div className="ios-list-group">
                                <div className="ios-list-row">
                                    <span className="ios-label">회사명</span>
                                    <div className="ios-value-wrap">
                                        <input type="text" name="companyName" value={basicInfo.companyName} onChange={handleBasicChange} className="ios-input-clean" />
                                    </div>
                                </div>
                                <div className="ios-list-row" style={{ alignItems: 'flex-start', padding: '16px' }}>
                                    <span className="ios-label" style={{ marginTop: '4px' }}>사업장 주소</span>
                                    <div className="ios-value-wrap" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
                                            <input type="text" name="zipCode" value={basicInfo.zipCode} onChange={handleBasicChange} className="ios-input-clean" style={{ width: '80px', flex: 'none' }} placeholder="우편번호" />
                                            <button className="ios-btn-micro outline"><Search size={12}/> 우편번호</button>
                                        </div>
                                        <input type="text" name="address1" value={basicInfo.address1} onChange={handleBasicChange} className="ios-input-clean" style={{ maxWidth: '100%' }} placeholder="기본주소" />
                                        <input type="text" name="address2" value={basicInfo.address2} onChange={handleBasicChange} className="ios-input-clean" style={{ maxWidth: '100%' }} placeholder="상세주소" />
                                    </div>
                                </div>
                                <div className="ios-list-row">
                                    <span className="ios-label">대표자명</span>
                                    <input type="text" name="ceo" value={basicInfo.ceo} onChange={handleBasicChange} className="ios-input-clean" />
                                </div>
                                <div className="ios-list-row">
                                    <span className="ios-label">사업자 등록번호</span>
                                    <input type="text" name="bizNum" value={basicInfo.bizNum} onChange={handleBasicChange} className="ios-input-clean" />
                                </div>
                                <div className="ios-list-row">
                                    <span className="ios-label">통신판매업 번호</span>
                                    <input type="text" name="mailOrderNum" value={basicInfo.mailOrderNum} onChange={handleBasicChange} className="ios-input-clean" placeholder="제 0000-지역-0000호" />
                                </div>
                            </div>

                            <div className="ios-group-title">연락망 및 도메인</div>
                            <div className="ios-list-group">
                                <div className="ios-list-row">
                                    <span className="ios-label">사이트명</span>
                                    <input type="text" name="siteName" value={basicInfo.siteName} onChange={handleBasicChange} className="ios-input-clean" />
                                </div>
                                <div className="ios-list-row">
                                    <span className="ios-label">대표 도메인</span>
                                    <input type="text" name="domain" value={basicInfo.domain} onChange={handleBasicChange} className="ios-input-clean" />
                                </div>
                                <div className="ios-list-row">
                                    <span className="ios-label">대표전화</span>
                                    <div className="ios-value-wrap">
                                        <select name="phone1" value={basicInfo.phone1} onChange={handleBasicChange} className="ios-select-clean" style={{width:'60px'}}><option>1588</option><option>02</option></select>
                                        <span style={{color:'#C7C7CC'}}>-</span>
                                        <input type="text" name="phone2" value={basicInfo.phone2} onChange={handleBasicChange} className="ios-input-clean" style={{width:'50px', flex:'none'}} />
                                        <span style={{color:'#C7C7CC'}}>-</span>
                                        <input type="text" name="phone3" value={basicInfo.phone3} onChange={handleBasicChange} className="ios-input-clean" style={{width:'50px', flex:'none'}} />
                                    </div>
                                </div>
                                <div className="ios-list-row">
                                    <span className="ios-label">휴대폰</span>
                                    <div className="ios-value-wrap">
                                        <select name="mobile1" value={basicInfo.mobile1} onChange={handleBasicChange} className="ios-select-clean" style={{width:'60px'}}><option>010</option></select>
                                        <span style={{color:'#C7C7CC'}}>-</span>
                                        <input type="text" name="mobile2" value={basicInfo.mobile2} onChange={handleBasicChange} className="ios-input-clean" style={{width:'50px', flex:'none'}} />
                                        <span style={{color:'#C7C7CC'}}>-</span>
                                        <input type="text" name="mobile3" value={basicInfo.mobile3} onChange={handleBasicChange} className="ios-input-clean" style={{width:'50px', flex:'none'}} />
                                    </div>
                                </div>
                                <div className="ios-list-row">
                                    <span className="ios-label">사이트 이메일</span>
                                    <input type="email" name="email" value={basicInfo.email} onChange={handleBasicChange} className="ios-input-clean" />
                                </div>
                            </div>

                            {/* 🚨 입금 방식 선택 및 정보 입력 영역 */}
                            <div className="ios-group-title">무통장 / 전자지갑 입금 설정</div>
                            <div className="ios-list-group">
                                <div className="ios-list-row">
                                    <span className="ios-label">입금 방식 선택</span>
                                    <div style={{ display: 'flex', gap: '4px', background: '#F2F2F7', padding: '2px', borderRadius: '8px' }}>
                                        <div className={`ios-btn-micro ${basicInfo.depositType === 'bank' ? 'active' : ''}`} style={{ background: basicInfo.depositType === 'bank' ? '#FFF' : 'transparent', color: basicInfo.depositType === 'bank' ? '#1C1C1E' : '#8E8E93', boxShadow: basicInfo.depositType === 'bank' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none' }} onClick={() => setBasicInfo({...basicInfo, depositType: 'bank'})}>
                                            일반 은행 계좌
                                        </div>
                                        <div className={`ios-btn-micro ${basicInfo.depositType === 'wallet' ? 'active' : ''}`} style={{ background: basicInfo.depositType === 'wallet' ? '#FFF' : 'transparent', color: basicInfo.depositType === 'wallet' ? '#1C1C1E' : '#8E8E93', boxShadow: basicInfo.depositType === 'wallet' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none' }} onClick={() => setBasicInfo({...basicInfo, depositType: 'wallet'})}>
                                            전자지갑 주소
                                        </div>
                                    </div>
                                </div>

                                {basicInfo.depositType === 'bank' ? (
                                    <>
                                        <div className="ios-list-row">
                                            <span className="ios-label">은행명</span>
                                            <input type="text" name="bankName" value={basicInfo.bankName} onChange={handleBasicChange} className="ios-input-clean" placeholder="예: 국민은행" />
                                        </div>
                                        <div className="ios-list-row">
                                            <span className="ios-label">계좌번호</span>
                                            <input type="text" name="accountNumber" value={basicInfo.accountNumber} onChange={handleBasicChange} className="ios-input-clean" placeholder="예: 896-88-01674" />
                                        </div>
                                        <div className="ios-list-row">
                                            <span className="ios-label">예금주</span>
                                            <input type="text" name="accountHolder" value={basicInfo.accountHolder} onChange={handleBasicChange} className="ios-input-clean" placeholder="예: (주)에프엠솔루션" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="ios-list-row" style={{ alignItems: 'flex-start', padding: '16px' }}>
                                        <span className="ios-label" style={{ marginTop: '4px' }}>전자지갑 주소</span>
                                        <div className="ios-value-wrap">
                                            <textarea 
                                                name="walletAddress" 
                                                value={basicInfo.walletAddress} 
                                                onChange={handleBasicChange} 
                                                className="ios-input-clean" 
                                                style={{ maxWidth: '100%', width: '100%', height: '80px', textAlign: 'left', background: '#F9F9FB', padding: '12px', borderRadius: '8px', border: '0.5px solid #C6C6C8', resize: 'none' }} 
                                                placeholder="예: 0x1234567890abcdef..." 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {subTab === 'favicon' && (
                        <div className="ios-list-group">
                            <div className="ios-list-row">
                                <span className="ios-label">브라우저 탭 타이틀</span>
                                <div className="ios-value-wrap">
                                    <input type="text" name="siteTitle" value={basicInfo.siteTitle} onChange={handleBasicChange} className="ios-input-clean" style={{ maxWidth: '100%' }} />
                                </div>
                            </div>
                            <div className="ios-list-row" style={{ minHeight: '60px' }}>
                                <span className="ios-label">파비콘 (Favicon)</span>
                                <div className="ios-value-wrap">
                                    {basicInfo.faviconUrl && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', background: '#F9F9FB', borderRadius: '8px', border: '0.5px solid #E5E5EA' }}>
                                            <img src={basicInfo.faviconUrl} alt="favicon" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                            <button onClick={() => setBasicInfo(prev => ({...prev, faviconUrl: ''}))} style={{ background:'none', border:'none', color:'#FF3B30', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}><X size={12} /></button>
                                        </div>
                                    )}
                                    <input type="file" id="favicon-upload" accept=".ico,.png,.jpg" style={{ display: 'none' }} onChange={handleFaviconUpload} />
                                    <label htmlFor="favicon-upload" className="ios-btn-micro outline">
                                        {isUploadingFavicon ? <Loader2 size={12} className="lucide-spin" /> : <Upload size={12} />}
                                        {isUploadingFavicon ? '업로드 중' : '이미지 선택'}
                                    </label>
                                </div>
                            </div>
                            <div style={{ padding: '12px 16px', backgroundColor: '#F9F9FB', fontSize: '11px', color: '#8E8E93', borderTop: '0.5px solid #E5E5EA' }}>
                                * 파비콘은 브라우저 탭에 표시되는 아이콘입니다. (권장: 16x16px 정사각형 이미지)
                            </div>
                        </div>
                    )}
                </div>
            )}

            {mainTab === 'policy' && (
                <div className="fade-in">
                    <div className="ios-segment-sub" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
                        <div className={`ios-segment-sub-btn ${subTab === 'terms' ? 'active' : ''}`} onClick={() => setSubTab('terms')}>이용약관</div>
                        <div className={`ios-segment-sub-btn ${subTab === 'privacy' ? 'active' : ''}`} onClick={() => setSubTab('privacy')}>개인정보처리방침</div>
                        <div className={`ios-segment-sub-btn ${subTab === 'emailReject' ? 'active' : ''}`} onClick={() => setSubTab('emailReject')}>이메일무단수집거부</div>
                        <div className={`ios-segment-sub-btn ${subTab === 'operation' ? 'active' : ''}`} onClick={() => setSubTab('operation')}>운영정책</div>
                    </div>

                    <div className="ios-group-title">정책 내용 편집</div>
                    <div className="ios-list-group" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#8E8E93' }}>시행 적용일</span>
                            <select className="ios-select-clean"><option>2026년</option></select>
                            <select className="ios-select-clean"><option>01월</option></select>
                            <select className="ios-select-clean"><option>01일</option></select>
                        </div>
                        
                        {subTab === 'privacy' && (
                            <div style={{ display: 'flex', gap: '12px', background: '#F9F9FB', padding: '12px', borderRadius: '10px', border: '0.5px solid #E5E5EA' }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '600', display: 'block', marginBottom: '4px' }}>관리책임자 정보</span>
                                    <input type="text" className="ios-input-clean" style={{ textAlign: 'left', color: '#1C1C1E', width: '100%', background: '#FFF', padding: '6px', borderRadius: '6px', border: '0.5px solid #C6C6C8' }} value={`${policies.privacyManager} (${policies.privacyManagerPos})`} readOnly />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '600', display: 'block', marginBottom: '4px' }}>책임자 이메일</span>
                                    <input type="text" className="ios-input-clean" style={{ textAlign: 'left', color: '#1C1C1E', width: '100%', background: '#FFF', padding: '6px', borderRadius: '6px', border: '0.5px solid #C6C6C8' }} value={policies.privacyManagerEmail} readOnly />
                                </div>
                            </div>
                        )}

                        <div className="ios-textarea-box">
                            <textarea 
                                className="ios-textarea"
                                name={subTab === 'terms' ? 'termsContent' : subTab === 'privacy' ? 'privacyContent' : subTab === 'emailReject' ? 'emailRejectContent' : 'operationContent'}
                                value={subTab === 'terms' ? policies.termsContent : subTab === 'privacy' ? policies.privacyContent : subTab === 'emailReject' ? policies.emailRejectContent : policies.operationContent}
                                onChange={handlePolicyChange}
                                placeholder="고객에게 노출될 정책 내용을 입력하세요."
                            />
                        </div>
                    </div>
                </div>
            )}

            {mainTab === 'member' && (
                <div className="fade-in">
                    <div className="ios-segment-sub">
                        <div className={`ios-segment-sub-btn ${subTab === 'join' ? 'active' : ''}`} onClick={() => setSubTab('join')}>가입항목 설정</div>
                        <div className={`ios-segment-sub-btn ${subTab === 'approve' ? 'active' : ''}`} onClick={() => setSubTab('approve')}>운영/승인 방식</div>
                    </div>

                    {subTab === 'approve' && (
                        <div className="ios-list-group">
                            <div className="ios-list-row">
                                <span className="ios-label" style={{ width: 'auto' }}>가입 승인 방식</span>
                                <div style={{ display: 'flex', gap: '4px', background: '#F2F2F7', padding: '2px', borderRadius: '8px' }}>
                                    <div className={`ios-btn-micro ${approveMethod === 'auto' ? 'active' : ''}`} style={{ background: approveMethod === 'auto' ? '#FFF' : 'transparent', color: approveMethod === 'auto' ? '#1C1C1E' : '#8E8E93', boxShadow: approveMethod === 'auto' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none' }} onClick={() => setApproveMethod('auto')}>자동 승인</div>
                                    <div className={`ios-btn-micro ${approveMethod === 'manual' ? 'active' : ''}`} style={{ background: approveMethod === 'manual' ? '#FFF' : 'transparent', color: approveMethod === 'manual' ? '#1C1C1E' : '#8E8E93', boxShadow: approveMethod === 'manual' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none' }} onClick={() => setApproveMethod('manual')}>관리자 승인</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'join' && (
                        <>
                            <div className="ios-group-title">회원가입 폼 구성</div>
                            <div className="ios-list-group" style={{ padding: 0 }}>
                                <table className="ios-table">
                                    <thead>
                                        <tr>
                                            <th className="ios-th">입력 항목명</th>
                                            <th className="ios-th" style={{ textAlign: 'center' }}>수집(표시) 사용</th>
                                            <th className="ios-th" style={{ textAlign: 'center' }}>필수 입력 여부</th>
                                            <th className="ios-th" style={{ textAlign: 'right', paddingRight: '16px' }}>비고</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {joinFields.map(field => (
                                            <tr key={field.id} style={{ backgroundColor: field.fixed ? '#F9F9FB' : '#FFFFFF' }}>
                                                <td className="ios-td" style={{ fontWeight: '600' }}>{field.name}</td>
                                                <td className="ios-td" style={{ textAlign: 'center' }}>
                                                    <div className={`ios-toggle ${field.use ? 'active' : ''}`} style={{ margin: '0 auto', opacity: field.fixed ? 0.5 : 1, cursor: field.fixed ? 'not-allowed' : 'pointer' }} onClick={() => handleFieldToggle(field.id, 'use')}><div className="ios-toggle-knob"></div></div>
                                                </td>
                                                <td className="ios-td" style={{ textAlign: 'center' }}>
                                                    <div className={`ios-toggle ${field.required ? 'active' : ''}`} style={{ margin: '0 auto', opacity: field.fixed ? 0.5 : 1, cursor: field.fixed ? 'not-allowed' : 'pointer' }} onClick={() => handleFieldToggle(field.id, 'required')}><div className="ios-toggle-knob"></div></div>
                                                </td>
                                                <td className="ios-td" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                                    {field.fixed ? <span style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '600' }}>시스템 필수</span> : <span style={{ fontSize: '11px', color: '#007AFF', fontWeight: '600' }}>선택형 필드</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            <button onClick={handleSave} disabled={isSaving} className="ios-submit-btn">
                {isSaving ? <Loader2 size={18} className="lucide-spin" /> : <Save size={18} />}
                {isSaving ? "데이터 동기화 중..." : "변경사항 일괄 저장"}
            </button>
        </div>
    );
}