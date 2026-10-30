'use client';

import { TicketsView } from '@/components/Modules/TicketsView';
import { useAppSession } from '@/context/AppSessionContext';

export default function TicketsPage() {
  const { selectedMonth } = useAppSession();
  return <TicketsView selectedMonth={selectedMonth} />;
}
