'use client';

import { UserManagementView } from '@/components/Modules/UserManagementView';
import { useAppSession } from '@/context/AppSessionContext';

export default function UsersPage() {
  const { currentUser } = useAppSession();
  return <UserManagementView currentUser={currentUser} />;
}
