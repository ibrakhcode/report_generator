'use client';

import dynamic from 'next/dynamic';
import { useAppSession } from '@/context/AppSessionContext';
import { ViewLoading } from '@/components/layout/ViewLoading';

const DashboardView = dynamic(
  () => import('@/components/Modules/DashboardView').then((mod) => ({ default: mod.DashboardView })),
  { ssr: false, loading: () => <ViewLoading /> }
);

export default function DashboardPage() {
  const { selectedMonth, selectModule } = useAppSession();
  return <DashboardView selectedMonth={selectedMonth} onNavigate={selectModule} />;
}
