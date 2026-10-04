// src/components/admin/AdminProfit.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Calendar, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function AdminProfit({ adminTheme }) {
    const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'user'

    // 1. 일별 통계 가져오기
    const { data: dailyStats = [], isLoading: isDailyLoading } = useQuery({
        queryKey: ['adminProfitDaily'],
        queryFn: async () => {
            const { data, error } = await supabase.from('admin_profit_daily').select('*').order('trade_date', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // 2. 회원별 통계 가져오기
    const { data: userStats = [], isLoading: isUserLoading } = useQuery({
        queryKey: ['adminProfitUsers'],
        queryFn: async () => {
            const { data, error } = await supabase.from('admin_profit_users').select('*').order('net_profit', { ascending: false });
            if (error) throw error;
            // 입금 또는 출금 내역이 하나라도 있는 유저만 필터링
            return data?.filter(u => u.total_deposit > 0 || u.total_withdraw > 0) || [];
        }
    });

    // 3. 🚨 전체 누적 통계 계산
    const totalDeposit = dailyStats.reduce((sum, item) => sum + Number(item.total_deposit), 0);
    const totalWithdraw = dailyStats.reduce((sum, item) => sum + Number(item.total_withdraw), 0);
    const netProfit = totalDeposit - totalWithdraw;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: adminTheme.textBright, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>수익금 (정산) 통계</h2>
                <p style={{ fontSize: '14px', color: adminTheme.textMuted, margin: 0 }}>플랫폼의 전체 누적 수익금, 일별 흐름, 회원별 정산 기여도를 확인합니다.</p>
            </div>

            {/* 🚨 전체(통합) 누적 수익금 현황 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: '#DBEAFE' }}><ArrowUpRight size={20} color="#2563EB"/></div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: adminTheme.textMuted }}>전체 누적 충전액 (입금)</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#1C1C1E' }}>₩ {totalDeposit.toLocaleString()}</div>
                </div>
                
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: '#FEE2E2' }}><ArrowDownRight size={20} color="#DC2626"/></div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: adminTheme.textMuted }}>전체 누적 환전액 (출금)</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#1C1C1E' }}>₩ {totalWithdraw.toLocaleString()}</div>
                </div>

                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', border: 'none', color: '#FFF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)' }}><TrendingUp size={20} color="#38BDF8"/></div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#94A3B8' }}>플랫폼 순수익 (충전 - 환전)</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFF' }}>
                        {netProfit >= 0 ? '+' : ''} ₩ {netProfit.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* 필터 탭 */}
            <div style={{ display: 'inline-flex', background: '#E2E8F0', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
                <button style={tabStyle(activeTab === 'daily')} onClick={() => setActiveTab('daily')}>
                    <Calendar size={16}/> 일별 수익금 흐름
                </button>
                <button style={tabStyle(activeTab === 'user')} onClick={() => setActiveTab('user')}>
                    <Users size={16}/> 회원별 수익 분석
                </button>
            </div>

            {/* 테이블 영역 */}
            <div style={{ background: adminTheme.panelBg, borderRadius: '16px', border: `1px solid ${adminTheme.border}`, overflow: 'hidden', boxShadow: adminTheme.shadow }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr>
                            {activeTab === 'daily' ? (
                                <><th style={thStyle}>날짜</th><th style={{...thStyle, textAlign:'right'}}>일일 충전액 (입금)</th><th style={{...thStyle, textAlign:'right'}}>일일 환전액 (출금)</th><th style={{...thStyle, textAlign:'right', color:'#2563EB'}}>일일 순수익</th></>
                            ) : (
                                <><th style={thStyle}>회원 정보</th><th style={{...thStyle, textAlign:'right'}}>총 충전액 (입금)</th><th style={{...thStyle, textAlign:'right'}}>총 환전액 (출금)</th><th style={{...thStyle, textAlign:'right', color:'#2563EB'}}>회사 기여 순수익</th></>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {(activeTab === 'daily' ? isDailyLoading : isUserLoading) ? (
                            <tr><td colSpan="4" style={{ padding: '60px', textAlign: 'center', color: adminTheme.textMuted }}>데이터 분석 중...</td></tr>
                        ) : activeTab === 'daily' ? (
                            dailyStats.map(stat => (
                                <tr key={stat.trade_date} style={{ borderBottom: `1px solid ${adminTheme.border}` }}>
                                    <td style={{ padding: '16px 20px', fontWeight: '600', color: adminTheme.textBright }}>{stat.trade_date}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: '#16A34A' }}>+ ₩ {Number(stat.total_deposit).toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: '#DC2626' }}>- ₩ {Number(stat.total_withdraw).toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '800', color: Number(stat.net_profit) >= 0 ? '#2563EB' : '#DC2626' }}>
                                        {Number(stat.net_profit) > 0 ? '+' : ''} ₩ {Number(stat.net_profit).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            userStats.map(stat => (
                                <tr key={stat.user_id} style={{ borderBottom: `1px solid ${adminTheme.border}` }}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: '700', color: adminTheme.textBright }}>{stat.name || '이름미상'}</div>
                                        <div style={{ fontSize: '12px', color: adminTheme.textMuted }}>{stat.email}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: '#16A34A' }}>+ ₩ {Number(stat.total_deposit).toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: '#DC2626' }}>- ₩ {Number(stat.total_withdraw).toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '800', color: Number(stat.net_profit) >= 0 ? '#2563EB' : '#DC2626' }}>
                                        {Number(stat.net_profit) > 0 ? '+' : ''} ₩ {Number(stat.net_profit).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// 인라인 스타일 헬퍼
const cardStyle = { background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' };
const thStyle = { background: '#F8FAFC', padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: '#64748B', borderBottom: '1px solid #E2E8F0' };
const tabStyle = (isActive) => ({ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', backgroundColor: isActive ? '#FFFFFF' : 'transparent', color: isActive ? '#0F172A' : '#64748B', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.04)' : 'none' });