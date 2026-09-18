// src/components/admin/hooks/useAdminUsers.js
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../api/supabaseClient';

export const useAdminUsers = (page = 1, pageSize = 20) => {
    return useQuery({
        queryKey: ['adminUsers', page, pageSize],
        queryFn: async () => {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // 🚨 핵심 수정: select 구문에 is_blocked, admin_memo 컬럼을 추가했습니다.
            const { data: profiles, error: profileError, count } = await supabase
                .from('profiles')
                .select('id, name, role, email, created_at, cash_balance, is_blocked, admin_memo', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (profileError) {
                console.error("Profiles Fetch Error:", profileError);
                throw profileError;
            }
            
            if (!profiles || profiles.length === 0) {
                return { users: [], totalCount: count || 0 };
            }

            const profileIds = profiles.map(p => p.id);

            const { data: partners, error: partnerError } = await supabase
                .from('partners')
                .select('id, store_name, status')
                .in('id', profileIds);

            if (partnerError) {
                console.error("Partners Fetch Error:", partnerError);
                throw partnerError;
            }

            const mergedUsers = profiles.map(profile => {
                const partnerData = partners?.find(p => p.id === profile.id);
                return {
                    ...profile,
                    partners: partnerData ? [partnerData] : []
                };
            });

            return { users: mergedUsers, totalCount: count || 0 };
        },
        keepPreviousData: true, 
    });
};