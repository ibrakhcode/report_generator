'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginView } from '@/components/Auth/LoginView';
import { storage } from '@/services/storage';
import { auth } from '@/services/auth';
import { useAppSession } from '@/context/AppSessionContext';

export default function LoginPage() {
  const router = useRouter();
  const { ready, currentUser, companyRegistered, refreshSession } = useAppSession();

  useEffect(() => {
    if (!ready) return;
    if (currentUser && !companyRegistered) {
      router.replace('/setup/company');
    } else if (currentUser && companyRegistered) {
      router.replace('/dashboard');
    }
  }, [ready, currentUser, companyRegistered, router]);

  return (
    <LoginView
      onSuccess={() => {
        refreshSession();
        if (storage.isCompanyRegistered(auth.getCurrentUser())) {
          router.push('/dashboard');
        } else {
          router.push('/setup/company');
        }
      }}
    />
  );
}
