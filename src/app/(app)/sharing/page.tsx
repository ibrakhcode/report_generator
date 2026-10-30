'use client';

import { SharingView } from '@/components/Modules/SharingView';
import { useAppSession } from '@/context/AppSessionContext';

export default function SharingPage() {
  const { selectedMonth } = useAppSession();
  return <SharingView selectedMonth={selectedMonth} />;
}
