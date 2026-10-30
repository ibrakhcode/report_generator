'use client';

import { MonthlyReportsView } from '@/components/Modules/MonthlyReportsView';
import { useAppSession } from '@/context/AppSessionContext';

export default function ReportsPage() {
  const { selectedMonth, selectModule } = useAppSession();
  return (
    <MonthlyReportsView
      selectedMonth={selectedMonth}
      onNavigateToShare={() => selectModule('sharing')}
    />
  );
}
