'use client';

import React from 'react';
import {
  LayoutDashboard,
  Clock,
  LifeBuoy,
  Cpu,
  CheckSquare,
  Target,
  FolderGit2,
  Folder,
  BookOpen,
  FileText,
  Wrench,
  Send,
  Users,
  Sliders,
  ShieldCheck,
  Database,
  Sparkles,
  LayoutGrid,
  Mail,
  Package
} from 'lucide-react';

export function ModuleIcon({
  iconName,
  className = 'w-5 h-5'
}: {
  iconName: string;
  className?: string;
}) {
  const props = { className };
  switch (iconName) {
    case 'LayoutDashboard':
      return <LayoutDashboard {...props} />;
    case 'Clock':
      return <Clock {...props} />;
    case 'LifeBuoy':
      return <LifeBuoy {...props} />;
    case 'Cpu':
      return <Cpu {...props} />;
    case 'CheckSquare':
      return <CheckSquare {...props} />;
    case 'Target':
      return <Target {...props} />;
    case 'FolderGit2':
      return <FolderGit2 {...props} />;
    case 'Folder':
      return <Folder {...props} />;
    case 'BookOpen':
      return <BookOpen {...props} />;
    case 'FileText':
      return <FileText {...props} />;
    case 'Wrench':
      return <Wrench {...props} />;
    case 'Send':
      return <Send {...props} />;
    case 'Users':
      return <Users {...props} />;
    case 'Sliders':
      return <Sliders {...props} />;
    case 'ShieldCheck':
      return <ShieldCheck {...props} />;
    case 'Database':
      return <Database {...props} />;
    case 'LayoutGrid':
      return <LayoutGrid {...props} />;
    case 'Mail':
      return <Mail {...props} />;
    case 'Package':
      return <Package {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}
