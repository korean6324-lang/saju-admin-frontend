// src/components/admin/AdminCash.jsx
import React from 'react';
import { CreditCard } from 'lucide-react';

export default function AdminCash() {
    const styles = {
        container: { 
            backgroundColor: '#FFFFFF', 
            padding: '40px', 
            fontFamily: '"Malgun Gothic", "Pretendard", sans-serif', 
            minHeight: '800px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
        },
        title: { fontSize: '24px', fontWeight: 'bold', color: '#111', marginTop: '16px', marginBottom: '8px' },
        desc: { fontSize: '14px', color: '#666', lineHeight: '1.6' }
    };

    return (
        <div style={styles.container} className="fade-in">
            <CreditCard size={48} color="#D1D5DB" />
            <h2 style={styles.title}>결제 및 정산 시스템 개편 중</h2>
            <p style={styles.desc}>
                기존 캐시(C) 기반 결제 시스템이 열람권(티켓) 중심 시스템으로 개편되었습니다.<br/>
                현재 이 페이지는 사용되지 않으며, 새로운 결제/정산 모듈 업데이트 시 활성화될 예정입니다.
            </p>
        </div>
    );
}