'use client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { useQuery } from '@tanstack/react-query';
import { getChartsDataAction } from '@/utils/actions';
function ChartsContainer() {
  const { data, isPending } = useQuery({
    queryKey: ['charts'],
    queryFn: () => getChartsDataAction(),
  });

  if (isPending) return <h2 className='text-xl font-medium'>Please wait...</h2>;
  if (!data || !data.monthlyData || data.monthlyData.length < 1) return null;
  return (
    <section className='mt-16 glass p-8 rounded-3xl shadow-xl border-white/20'>
      <h1 className='text-3xl font-bold text-center mb-10 text-primary'>
        Andamento Inserimenti
      </h1>
      <ResponsiveContainer width='100%' height={350}>
        <BarChart data={data.monthlyData}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' opacity={0.5} />
          <XAxis 
            dataKey='date' 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
          />
          <YAxis 
            allowDecimals={false} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
          />
          <Tooltip 
            cursor={{ fill: 'hsla(184, 100%, 29%, 0.05)' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          />
          <Bar 
            dataKey='count' 
            fill='#008C95' 
            radius={[6, 6, 0, 0]} 
            barSize={60} 
          />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
export default ChartsContainer;
