'use client';

import { ActivitiesView } from '@/components/Modules/ActivitiesView';
import { useAppSession } from '@/context/AppSessionContext';

export default function ActivitiesPage() {
  const { selectedMonth } = useAppSession();
  return <ActivitiesView selectedMonth={selectedMonth} />;
}
