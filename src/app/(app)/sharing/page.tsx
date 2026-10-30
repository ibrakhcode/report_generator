'use client';

import dynamic from 'next/dynamic';
import { useAppSession } from '@/context/AppSessionContext';
import { ViewLoading } from '@/components/layout/ViewLoading';

const SharingView = dynamic(
  () => import('@/components/Modules/SharingView').then((mod) => ({ default: mod.SharingView })),
  { ssr: false, loading: () => <ViewLoading /> }
);

export default function SharingPage() {
  const { selectedMonth } = useAppSession();
  return <SharingView selectedMonth={selectedMonth} />;
}
