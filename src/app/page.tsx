'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSession } from '@/context/AppSessionContext';

export default function HomePage() {
  const router = useRouter();
  const { ready, currentUser, companyRegistered } = useAppSession();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (!companyRegistered) {
      router.replace('/setup/company');
      return;
    }
    router.replace('/dashboard');
  }, [ready, currentUser, companyRegistered, router]);

  return <div className="min-h-screen bg-slate-950" />;
}
