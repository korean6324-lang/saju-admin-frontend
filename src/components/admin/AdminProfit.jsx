// src/components/admin/AdminProfit.jsx
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Calendar, ArrowDownRight, ArrowUpRight, Coins, Gamepad2 } from 'lucide-react';

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
            return data?.filter(u => u.total_deposit > 0 || u.total_withdraw > 0) || [];
        }
    });

    // 3. 🚨 실시간 유저 총 보유 자산 가져오기 (방금 만든 SQL View 활용)
    const { data: totalBalances = { total_points: 0, total_game_money: 0 } } = useQuery({
        queryKey: ['adminTotalBalances'],
        queryFn: async () => {
            const { data, error } = await supabase.from('admin_total_balances').select('*').maybeSingle();
            if (error) throw error;
            return data || { total_points: 0, total_game_money: 0 };
        },
        refetchInterval: 10000 // 10초마다 자동 갱신
    });

    // 누적 통계 계산
    const totalDeposit = dailyStats.reduce((sum, item) => sum + Number(item.total_deposit), 0);
    const totalWithdraw = dailyStats.reduce((sum, item) => sum + Number(item.total_withdraw), 0);
    const netProfit = totalDeposit - totalWithdraw;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: adminTheme.textBright, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>수익금 및 자산 통계</h2>
                <p style={{ fontSize: '13px', color: adminTheme.textMuted, margin: 0 }}>플랫폼 실시간 자산과 정산 내역을 한눈에 모니터링합니다.</p>
            </div>

            {/* 🚨 정보제공 패널: 작고 밀도 있게(Compact) 5열 배치 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                
                {/* 실시간 보유 포인트 (발행 부채) */}
                <div style={denseCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Coins size={14} color="#D97706"/>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: adminTheme.textMuted }}>유저 보유 포인트</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#1C1C1E', letterSpacing: '-0.5px' }}>
                        {Number(totalBalances.total_points).toLocaleString()} <span style={{fontSize:'13px', color:'#D97706'}}>P</span>
                    </div>
                </div>

                {/* 실시간 보유 게임머니 */}
                <div style={denseCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Gamepad2 size={14} color="#7C3AED"/>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: adminTheme.textMuted }}>유저 보유 게임머니</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#1C1C1E', letterSpacing: '-0.5px' }}>
                        {Number(totalBalances.total_game_money).toLocaleString()} <span style={{fontSize:'13px', color:'#7C3AED'}}>G</span>
                    </div>
                </div>

                {/* 누적 충전액 */}
                <div style={denseCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <ArrowUpRight size={14} color="#2563EB"/>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: adminTheme.textMuted }}>전체 누적 충전액</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#1C1C1E', letterSpacing: '-0.5px' }}>
                        ₩ {totalDeposit.toLocaleString()}
                    </div>
                </div>
                
                {/* 누적 환전액 */}
                <div style={denseCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <ArrowDownRight size={14} color="#DC2626"/>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: adminTheme.textMuted }}>전체 누적 환전액</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#1C1C1E', letterSpacing: '-0.5px' }}>
                        ₩ {totalWithdraw.toLocaleString()}
                    </div>
                </div>

                {/* 플랫폼 순수익 (가장 강조) */}
                <div style={{ ...denseCardStyle, background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <TrendingUp size={14} color="#38BDF8"/>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8' }}>플랫폼 순수익</span>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                        {netProfit >= 0 ? '+' : ''} ₩ {netProfit.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* 필터 탭 */}
            <div style={{ display: 'inline-flex', background: '#E2E8F0', borderRadius: '8px', padding: '3px', marginBottom: '16px' }}>
                <button style={tabStyle(activeTab === 'daily')} onClick={() => setActiveTab('daily')}>
                    <Calendar size={14}/> 일별 충/환전 흐름
                </button>
                <button style={tabStyle(activeTab === 'user')} onClick={() => setActiveTab('user')}>
                    <Users size={14}/> 회원별 수익 분석
                </button>
            </div>

            {/* 테이블 영역 (밀도 높임) */}
            <div style={{ background: adminTheme.panelBg, borderRadius: '12px', border: `1px solid ${adminTheme.border}`, overflow: 'hidden', boxShadow: adminTheme.shadow }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr>
                            {activeTab === 'daily' ? (
                                <><th style={thStyle}>날짜</th><th style={{...thStyle, textAlign:'right'}}>일일 충전 (입금)</th><th style={{...thStyle, textAlign:'right'}}>일일 환전 (출금)</th><th style={{...thStyle, textAlign:'right', color:'#2563EB'}}>일일 순수익</th></>
                            ) : (
                                <><th style={thStyle}>회원 정보</th><th style={{...thStyle, textAlign:'right'}}>총 충전액</th><th style={{...thStyle, textAlign:'right'}}>총 환전액</th><th style={{...thStyle, textAlign:'right', color:'#2563EB'}}>순수익 (기여도)</th></>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {(activeTab === 'daily' ? isDailyLoading : isUserLoading) ? (
                            <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: adminTheme.textMuted }}>데이터 분석 중...</td></tr>
                        ) : activeTab === 'daily' ? (
                            dailyStats.map(stat => (
                                <tr key={stat.trade_date} style={{ borderBottom: `1px solid ${adminTheme.border}` }}>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: adminTheme.textBright }}>{stat.trade_date}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', fontWeight: '600', color: '#16A34A' }}>+ ₩ {Number(stat.total_deposit).toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', fontWeight: '600', color: '#DC2626' }}>- ₩ {Number(stat.total_withdraw).toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', fontWeight: '800', color: Number(stat.net_profit) >= 0 ? '#2563EB' : '#DC2626' }}>
                                        {Number(stat.net_profit) > 0 ? '+' : ''} ₩ {Number(stat.net_profit).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            userStats.map(stat => (
                                <tr key={stat.user_id} style={{ borderBottom: `1px solid ${adminTheme.border}` }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: adminTheme.textBright }}>{stat.name || '이름미상'}</div>
                                        <div style={{ fontSize: '11px', color: adminTheme.textMuted }}>{stat.email}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', fontWeight: '600', color: '#16A34A' }}>+ ₩ {Number(stat.total_deposit).toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', fontWeight: '600', color: '#DC2626' }}>- ₩ {Number(stat.total_withdraw).toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', fontWeight: '800', color: Number(stat.net_profit) >= 0 ? '#2563EB' : '#DC2626' }}>
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

// 🚨 작고 밀도 있는(Compact) 패널 및 테이블 스타일 헬퍼
const denseCardStyle = { background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' };
const thStyle = { background: '#F8FAFC', padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#64748B', borderBottom: '1px solid #E2E8F0' };
const tabStyle = (isActive) => ({ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: '0.2s', backgroundColor: isActive ? '#FFFFFF' : 'transparent', color: isActive ? '#0F172A' : '#64748B', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.04)' : 'none' });