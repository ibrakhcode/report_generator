'use client';

import dynamic from 'next/dynamic';
import { useAppSession } from '@/context/AppSessionContext';
import { ViewLoading } from '@/components/layout/ViewLoading';

const MonthlyReportsView = dynamic(
  () =>
    import('@/components/Modules/MonthlyReportsView').then((mod) => ({ default: mod.MonthlyReportsView })),
  { ssr: false, loading: () => <ViewLoading /> }
);

export default function ReportsPage() {
  const { selectedMonth, selectModule } = useAppSession();
  return (
    <MonthlyReportsView
      selectedMonth={selectedMonth}
      onNavigateToShare={() => selectModule('sharing')}
    />
  );
}
