'use client';

import React, { useEffect, useState } from 'react';
import { Download, Eye, FolderPlus, Plus, Search, Trash2, Upload, X, Folder } from 'lucide-react';
import { notify } from '@/lib/systemNotify';

type LibraryFolder = { id: string; name: string };
type LibraryFile = {
  id: string;
  folder_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  description: string;
  uploaded_at: string;
};

export const ReportLibraryView: React.FC = () => {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [folderId, setFolderId] = useState('');
  const [search, setSearch] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ name: string; url: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = async () => {
    const response = await fetch('/api/rms/report-library/folders');
    const payload = (await response.json()) as { ok?: boolean; folders?: LibraryFolder[]; error?: string };
    if (!response.ok) {
      setError(payload.error || 'Could not load folders. Run the report library SQL in Supabase first.');
      return;
    }
    setError(null);
    const next = payload.folders || [];
    setFolders(next);
    setFolderId((current) => current || next[0]?.id || '');
  };

  const loadFiles = async (id: string, q: string) => {
    if (!id) {
      setFiles([]);
      return;
    }
    const response = await fetch(
      `/api/rms/report-library/files?folderId=${encodeURIComponent(id)}&q=${encodeURIComponent(q)}`
    );
    const payload = (await response.json()) as { files?: LibraryFile[] };
    setFiles(payload.files || []);
  };

  useEffect(() => {
    void loadFolders();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFiles(folderId, search);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [folderId, search]);

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const response = await fetch('/api/rms/report-library/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const payload = (await response.json()) as { folder?: LibraryFolder; error?: string };
    if (!response.ok) {
      notify.error('Folder not created', payload.error || 'Try again.');
      return;
    }
    setNewFolderName('');
    await loadFolders();
    if (payload.folder) setFolderId(payload.folder.id);
    notify.success('Folder created', name);
  };

  const deleteFolder = async (id: string) => {
    const ok = await notify.confirm('Delete folder', 'This removes the folder and all reports inside it.', 'Delete');
    if (!ok) return;
    await fetch(`/api/rms/report-library/folders?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setFolderId('');
    await loadFolders();
    notify.success('Folder deleted', 'The folder and its files were removed.');
  };

  const uploadFile = async (file: File) => {
    if (!folderId) return;
    setUploading(true);
    const body = new FormData();
    body.append('folderId', folderId);
    body.append('file', file);
    body.append('description', description);
    const response = await fetch('/api/rms/report-library/files', { method: 'POST', body });
    const payload = (await response.json()) as { error?: string };
    setUploading(false);
    if (!response.ok) {
      notify.error('Upload failed', payload.error || 'Could not save the report.');
      return;
    }
    setDescription('');
    await loadFiles(folderId, search);
    notify.success('Report uploaded', file.name);
  };

  const openFile = async (id: string, mode: 'preview' | 'download') => {
    const response = await fetch(`/api/rms/report-library/files?id=${encodeURIComponent(id)}`);
    const payload = (await response.json()) as { url?: string; file?: LibraryFile; error?: string };
    if (!payload.url) {
      notify.error('File unavailable', payload.error || 'No download link.');
      return;
    }
    if (mode === 'download') {
      const link = document.createElement('a');
      link.href = payload.url;
      link.download = payload.file?.file_name || 'report';
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.click();
      return;
    }
    setPreview({
      name: payload.file?.file_name || 'Report',
      url: payload.url,
      type: payload.file?.file_type || ''
    });
  };

  const deleteFile = async (id: string, name: string) => {
    const ok = await notify.confirm('Delete report', `Remove ${name}?`, 'Delete');
    if (!ok) return;
    await fetch(`/api/rms/report-library/files?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadFiles(folderId, search);
    notify.success('Report deleted', name);
  };

  const canPreviewInline = (type: string, name: string) => {
    const lower = name.toLowerCase();
    return type.startsWith('image/') || type === 'application/pdf' || lower.endsWith('.pdf') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Report Library</h2>
          <p className="text-xs text-slate-400 mt-1">
            Create folders, upload reports from this computer, then preview or download them.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-xs text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 min-h-[480px]">
        <aside className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-1">Folders</p>
          <div className="flex gap-2">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="flex-1 px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <button
              type="button"
              onClick={() => void createFolder()}
              className="px-2.5 rounded-xl bg-teal-600 text-white"
              title="Create folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`flex items-center gap-2 rounded-xl px-2 py-2 ${
                  folderId === folder.id ? 'bg-teal-500/15 text-teal-200' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <button type="button" className="flex-1 flex items-center gap-2 text-left text-sm" onClick={() => setFolderId(folder.id)}>
                  <Folder className="w-4 h-4 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </button>
                <button type="button" className="text-slate-500 hover:text-rose-400" onClick={() => void deleteFolder(folder.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search report file name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-bold text-white cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Upload report'}</span>
              <input
                type="file"
                className="hidden"
                disabled={!folderId || uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note for the next upload"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
          />

          {files.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Plus className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No reports in this folder yet</p>
              <p className="text-xs text-slate-400">Upload PDF, PowerPoint, Word, or image files from your computer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-3 font-semibold">File name</th>
                    <th className="py-2 pr-3 font-semibold">Type</th>
                    <th className="py-2 pr-3 font-semibold">Size</th>
                    <th className="py-2 pr-3 font-semibold">Uploaded</th>
                    <th className="py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} className="border-b border-slate-800/80 text-slate-200">
                      <td className="py-2.5 pr-3">
                        <span className="font-semibold text-white">{file.file_name}</span>
                        {file.description ? <span className="block text-[11px] text-slate-500">{file.description}</span> : null}
                      </td>
                      <td className="py-2.5 pr-3">{file.file_type || 'File'}</td>
                      <td className="py-2.5 pr-3">{((file.file_size || 0) / 1024).toFixed(1)} KB</td>
                      <td className="py-2.5 pr-3">{file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : ''}</td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-sky-300"
                            title="Preview"
                            onClick={() => void openFile(file.id, 'preview')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-teal-300"
                            title="Download"
                            onClick={() => void openFile(file.id, 'download')}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-rose-300"
                            title="Delete"
                            onClick={() => void deleteFile(file.id, file.file_name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <p className="text-sm font-semibold text-white truncate">{preview.name}</p>
              <button type="button" onClick={() => setPreview(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-slate-950">
              {canPreviewInline(preview.type, preview.name) ? (
                <iframe title={preview.name} src={preview.url} className="w-full h-full border-0" />
              ) : (
                <div className="h-full flex items-center justify-center text-center p-6">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">This file type cannot preview in the browser.</p>
                    <a
                      href={preview.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
                    >
                      <Download className="w-4 h-4" />
                      Open / download
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
