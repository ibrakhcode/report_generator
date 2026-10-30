'use client';

import { DashboardView } from '@/components/Modules/DashboardView';
import { useAppSession } from '@/context/AppSessionContext';

export default function DashboardPage() {
  const { selectedMonth, selectModule } = useAppSession();
  return <DashboardView selectedMonth={selectedMonth} onNavigate={selectModule} />;
}
