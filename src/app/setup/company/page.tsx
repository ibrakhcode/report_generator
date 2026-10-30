'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CompanyRegisterView } from '@/components/CompanySetup/CompanyRegisterView';
import { useAppSession } from '@/context/AppSessionContext';

export default function CompanySetupPage() {
  const router = useRouter();
  const { ready, currentUser, companyRegistered, refreshSession } = useAppSession();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (companyRegistered) {
      router.replace('/dashboard');
    }
  }, [ready, currentUser, companyRegistered, router]);

  if (!ready || !currentUser) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <CompanyRegisterView
      currentUser={currentUser}
      onComplete={() => {
        refreshSession();
        router.push('/dashboard');
      }}
    />
  );
}
