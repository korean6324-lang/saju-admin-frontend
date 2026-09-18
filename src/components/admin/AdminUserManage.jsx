// src/components/admin/AdminUserManage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Save, X, Edit, Trash2 } from 'lucide-react';

export default function AdminUserManage({ adminTheme }) {
    const queryClient = useQueryClient();

    // 화면 전환 상태: 'list' (목록) | 'form' (추가/수정 폼)
    const [viewMode, setViewMode] = useState('list');
    
    // 폼 상태 관리
    const [formData, setFormData] = useState({
        id: '', // Supabase Auth에서는 Email이 ID 역할을 함
        name: '',
        password: '',
        passwordConfirm: '',
        email1: '', email2: '',
        phone1: '02', phone2: '', phone3: '',
        mobile1: '010', mobile2: '', mobile3: '',
        department: '',
        position: '',
        memo: '',
        isLoginAllowed: true,
        permissions: { site: true, sms: true, design: true, mobile: true, config: true },
        startPage: '사이트운영'
    });
    
    const [isSaving, setIsSaving] = useState(false);

    // ==========================================================
    // 1. 관리자 리스트 페칭
    // ==========================================================
    const { data: adminUsers = [], isLoading } = useQuery({
        queryKey: ['adminUsersList'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'admin') // 관리자 권한만 불러오기
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    // ==========================================================
    // 2. 폼 핸들러
    // ==========================================================
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePermissionChange = (key) => {
        setFormData(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
        }));
    };

    const resetForm = () => {
        setFormData({
            id: '', name: '', password: '', passwordConfirm: '', email1: '', email2: '',
            phone1: '02', phone2: '', phone3: '', mobile1: '010', mobile2: '', mobile3: '',
            department: '', position: '', memo: '', isLoginAllowed: true,
            permissions: { site: true, sms: true, design: true, mobile: true, config: true },
            startPage: '사이트운영'
        });
    };

    const handleSave = async () => {
        if (!formData.id || !formData.name || !formData.password) {
            return alert("아이디, 이름, 비밀번호는 필수 입력 항목입니다.");
        }
        if (formData.password !== formData.passwordConfirm) {
            return alert("비밀번호가 일치하지 않습니다.");
        }

        setIsSaving(true);
        try {
            // 🚨 CTO Note: Supabase 클라이언트에서 임의로 다른 Auth 유저를 생성하는 것은 보안상 막혀있습니다.
            // 실제 서비스에서는 Edge Function(서버리스) 또는 별도의 백엔드 API를 호출하여 
            // supabase.auth.admin.createUser() 로직을 실행해야 합니다.
            // 여기서는 MVP 목적을 위해 DB Insert만 시뮬레이션 합니다.
            
            /* (백엔드 API 호출 예시)
               await fetch('/api/create-admin', { method: 'POST', body: JSON.stringify(formData) });
            */
            
            // 시뮬레이션 딜레이
            await new Promise(resolve => setTimeout(resolve, 800));

            alert("✅ 관리자 계정이 성공적으로 추가되었습니다.\n(※ 실제 Auth 생성은 백엔드 API 연동 필요)");
            resetForm();
            setViewMode('list');
            queryClient.invalidateQueries(['adminUsersList']);

        } catch (error) {
            alert("❌ 관리자 추가 중 오류가 발생했습니다.");
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
        
        formBox: { border: '2px solid #E5E7EB', borderTop: '2px solid #ef4444', display: 'flex', flexDirection: 'column', marginBottom: '24px' }, // 레퍼런스의 빨간 테두리 반영
        formRow: { display: 'flex', borderBottom: '1px solid #E5E7EB' },
        formLabel: { width: '140px', backgroundColor: '#F9FAFB', padding: '10px 16px', fontWeight: 'bold', color: '#444', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', fontSize: '12px', flexShrink: 0 },
        formContent: { flex: 1, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', flexWrap: 'wrap', color: '#555' },
        
        input: { padding: '4px 8px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', width: '100%', maxWidth: '200px' },
        select: { padding: '4px 8px', border: '1px solid #CCC', fontSize: '12px', outline: 'none', backgroundColor: '#FFF' },
        checkboxLabel: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginRight: '12px' },
        
        btnBlue: { backgroundColor: '#0ea5e9', color: '#FFF', border: 'none', padding: '6px 20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' },
        btnGray: { backgroundColor: '#9CA3AF', color: '#FFF', border: 'none', padding: '6px 20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' },
        btnOutline: { border: '1px solid #CCC', background: '#FFF', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', color: '#333', borderRadius: '2px' },
        
        // 테이블
        tableHeader: { backgroundColor: '#F8F9FA', borderTop: '2px solid #333', borderBottom: '1px solid #CCC', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '12px' },
        tableCell: { padding: '8px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px', color: '#555' },
    };

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 */}
            <div>
                <h2 style={styles.headerTitle}>{viewMode === 'list' ? '관리자페이지에 사용자 추가하기' : '사용자 추가'}</h2>
                <p style={styles.headerSub}>
                    {viewMode === 'list' 
                        ? '혼자 홈페이지를 관리하기 힘드시죠? 이럴 때 다른 사람을 관리자로 등록하는 관리자계정 추가 기능이 필요합니다.\n[환경설정 > 서비스관리 > 사용자관리] 메뉴에서 [추가] 버튼을 클릭합니다.' 
                        : '관리자는 최초 관리자 1명을 포함한 3명까지 등록이 가능하며, 아래와 같이 사용자 정보와 권한범위를 설정하고 [확인] 버튼을 클릭합니다.'}
                </p>
            </div>

            {/* ========================================================== */}
            {/* 뷰 모드: 리스트 (List) */}
            {/* ========================================================== */}
            {viewMode === 'list' && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #E5E7EB', padding: '12px', marginBottom: '24px', backgroundColor: '#F9FAFB' }}>
                        <span style={{ fontWeight: 'bold', marginRight: '16px', fontSize: '12px' }}>· 검색조건</span>
                        <select style={{ ...styles.select, width: '100px' }}><option>이름</option><option>아이디</option></select>
                        <input type="text" style={{ ...styles.input, marginLeft: '4px', width: '200px' }} />
                        <button style={{ ...styles.btnBlue, marginLeft: 'auto', padding: '8px 24px' }}>검색</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#555' }}>
                            검색결과 : <span style={{fontWeight: 'bold', color: '#ef4444'}}>{adminUsers.length}</span> 명
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #333' }}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>번호</th>
                                <th style={styles.tableHeader}>이름</th>
                                <th style={styles.tableHeader}>아이디</th>
                                <th style={styles.tableHeader}>휴대폰</th>
                                <th style={styles.tableHeader}>로그인</th>
                                <th style={styles.tableHeader}>초기화면</th>
                                <th style={styles.tableHeader}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</td></tr>
                            ) : adminUsers.map((admin, idx) => (
                                <tr key={admin.id}>
                                    <td style={styles.tableCell}>{idx + 1}</td>
                                    <td style={styles.tableCell}>{admin.name || '미설정'}</td>
                                    <td style={styles.tableCell}>{admin.email}</td>
                                    <td style={styles.tableCell}>-</td>
                                    <td style={styles.tableCell}>O</td>
                                    <td style={styles.tableCell}>환경설정</td>
                                    <td style={styles.tableCell}>
                                        <button style={styles.btnOutline}>수정</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button onClick={() => setViewMode('form')} style={{ ...styles.btnBlue, padding: '10px 24px', fontSize: '13px' }}>
                            <Plus size={16} /> 추가
                        </button>
                    </div>
                </>
            )}

            {/* ========================================================== */}
            {/* 뷰 모드: 추가/수정 폼 (Form) */}
            {/* ========================================================== */}
            {viewMode === 'form' && (
                <>
                    <div style={styles.sectionTitle}><div style={styles.sectionIcon}></div> 사용자 정보 입력</div>
                    <div style={styles.formBox}>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>아이디 <span style={{color: '#ef4444', marginLeft:'2px'}}>*</span></div>
                            <div style={styles.formContent}>
                                <input type="text" value={formData.id} onChange={e=>handleInputChange('id', e.target.value)} style={styles.input} />
                                <button style={styles.btnOutline}>중복체크</button>
                            </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>이름 <span style={{color: '#ef4444', marginLeft:'2px'}}>*</span></div>
                            <div style={styles.formContent}>
                                <input type="text" value={formData.name} onChange={e=>handleInputChange('name', e.target.value)} style={styles.input} />
                            </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>비밀번호 <span style={{color: '#ef4444', marginLeft:'2px'}}>*</span></div>
                            <div style={{...styles.formContent, flex: 'none', width: '300px', borderRight: '1px solid #E5E7EB'}}>
                                <input type="password" value={formData.password} onChange={e=>handleInputChange('password', e.target.value)} style={styles.input} />
                                <div style={{width: '100%', fontSize: '11px', color: '#999', marginTop: '4px'}}>* 알파벳 소문자, 숫자 포함 8자 이상 30자 이하</div>
                            </div>
                            <div style={{...styles.formLabel, width: '120px'}}>비밀번호 확인 <span style={{color: '#ef4444', marginLeft:'2px'}}>*</span></div>
                            <div style={styles.formContent}>
                                <input type="password" value={formData.passwordConfirm} onChange={e=>handleInputChange('passwordConfirm', e.target.value)} style={styles.input} />
                            </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>개인메일</div>
                            <div style={styles.formContent}>
                                <input type="text" value={formData.email1} onChange={e=>handleInputChange('email1', e.target.value)} style={{...styles.input, width: '100px'}} />
                                <span>@</span>
                                <input type="text" value={formData.email2} onChange={e=>handleInputChange('email2', e.target.value)} style={{...styles.input, width: '120px'}} />
                                <select style={styles.select}>
                                    <option>직접입력</option>
                                    <option>naver.com</option>
                                    <option>gmail.com</option>
                                </select>
                            </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>전화번호</div>
                            <div style={styles.formContent}>
                                <select value={formData.phone1} onChange={e=>handleInputChange('phone1', e.target.value)} style={{...styles.select, width: '60px'}}><option>02</option><option>031</option></select> - 
                                <input type="text" value={formData.phone2} onChange={e=>handleInputChange('phone2', e.target.value)} style={{...styles.input, width: '60px'}} /> - 
                                <input type="text" value={formData.phone3} onChange={e=>handleInputChange('phone3', e.target.value)} style={{...styles.input, width: '60px'}} />
                            </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>휴대폰</div>
                            <div style={styles.formContent}>
                                <select value={formData.mobile1} onChange={e=>handleInputChange('mobile1', e.target.value)} style={{...styles.select, width: '60px'}}><option>010</option><option>011</option></select> - 
                                <input type="text" value={formData.mobile2} onChange={e=>handleInputChange('mobile2', e.target.value)} style={{...styles.input, width: '60px'}} /> - 
                                <input type="text" value={formData.mobile3} onChange={e=>handleInputChange('mobile3', e.target.value)} style={{...styles.input, width: '60px'}} />
                            </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>소속(부서/팀)</div>
                            <div style={styles.formContent}>
                                <input type="text" value={formData.department} onChange={e=>handleInputChange('department', e.target.value)} style={{...styles.input, maxWidth: '400px'}} />
                                <span style={{color: '#999', fontSize: '11px', marginLeft: '4px'}}>예) 기획팀, 마케팅팀, 전략기획실, 임원</span>
                            </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>직급</div>
                            <div style={styles.formContent}>
                                <input type="text" value={formData.position} onChange={e=>handleInputChange('position', e.target.value)} style={{...styles.input, maxWidth: '400px'}} />
                                <span style={{color: '#999', fontSize: '11px', marginLeft: '4px'}}>예) 사원, 대리, 부장, 대표</span>
                            </div>
                        </div>
                        <div style={{...styles.formRow, borderBottom: 'none'}}>
                            <div style={styles.formLabel}>메모</div>
                            <div style={styles.formContent}>
                                <input type="text" value={formData.memo} onChange={e=>handleInputChange('memo', e.target.value)} style={{...styles.input, maxWidth: '100%'}} />
                            </div>
                        </div>
                    </div>

                    <div style={styles.sectionTitle}><div style={styles.sectionIcon}></div> 사용자 권한 설정</div>
                    <div style={{...styles.formBox, borderTop: '2px solid #E5E7EB'}}>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>로그인 허용</div>
                            <div style={styles.formContent}>
                                <label style={styles.checkboxLabel}>
                                    <input type="checkbox" checked={formData.isLoginAllowed} onChange={e=>handleInputChange('isLoginAllowed', e.target.value)} /> 허용함
                                </label>
                            </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formLabel}>권한설정</div>
                            <div style={{...styles.formContent, flexDirection: 'column', alignItems: 'flex-start', gap: '4px'}}>
                                <label style={styles.checkboxLabel}><input type="checkbox" checked={formData.permissions.site} onChange={()=>handlePermissionChange('site')}/> 사이트운영</label>
                                <label style={styles.checkboxLabel}><input type="checkbox" checked={formData.permissions.sms} onChange={()=>handlePermissionChange('sms')}/> SMS/메일</label>
                                <label style={styles.checkboxLabel}><input type="checkbox" checked={formData.permissions.design} onChange={()=>handlePermissionChange('design')}/> 디자인관리</label>
                                <label style={styles.checkboxLabel}><input type="checkbox" checked={formData.permissions.mobile} onChange={()=>handlePermissionChange('mobile')}/> 모바일 디자인관리</label>
                                <label style={styles.checkboxLabel}><input type="checkbox" checked={formData.permissions.config} onChange={()=>handlePermissionChange('config')}/> 환경설정</label>
                            </div>
                        </div>
                        <div style={{...styles.formRow, borderBottom: 'none'}}>
                            <div style={styles.formLabel}>첫 페이지 설정</div>
                            <div style={styles.formContent}>
                                <select value={formData.startPage} onChange={e=>handleInputChange('startPage', e.target.value)} style={styles.select}>
                                    <option>사이트운영</option>
                                    <option>환경설정</option>
                                </select>
                                <span style={{color: '#999', fontSize: '11px', display: 'block', width: '100%', marginTop: '4px'}}>로그인 시 로딩되는 첫 페이지를 설정합니다.</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '40px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button onClick={handleSave} disabled={isSaving} style={{ ...styles.btnBlue, padding: '8px 30px' }}>
                            {isSaving ? "저장 중..." : "확인"}
                        </button>
                        <button onClick={() => { setViewMode('list'); resetForm(); }} style={{ ...styles.btnGray, padding: '8px 30px' }}>
                            취소
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}