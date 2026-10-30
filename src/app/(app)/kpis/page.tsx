'use client';

import dynamic from 'next/dynamic';
import { ViewLoading } from '@/components/layout/ViewLoading';

const KpiView = dynamic(
  () => import('@/components/Modules/KpiView').then((mod) => ({ default: mod.KpiView })),
  { ssr: false, loading: () => <ViewLoading /> }
);

export default function KpisPage() {
  return <KpiView />;
}
