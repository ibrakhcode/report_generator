const DB_NAME = 'hesu_template_files_v1';
const STORE = 'files';

export const BUNDLED_DEFAULT_TEMPLATE_ID = 'TMPL-ICT-2026';
export const BUNDLED_DEFAULT_PPTX_NAME = 'IT_Support_Monthly_Report_Template.pptx';
export const BUNDLED_DEFAULT_PPTX_PATH = '/templates/IT_Support_Monthly_Report_Template.pptx';

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function loadBundledDefaultPptx(): Promise<string | undefined> {
  if (typeof fetch === 'undefined') return undefined;
  try {
    const res = await fetch(BUNDLED_DEFAULT_PPTX_PATH);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const dataUrl = await blobToDataUrl(blob);
    await saveTemplateFileLocal(BUNDLED_DEFAULT_TEMPLATE_ID, dataUrl);
    return dataUrl;
  } catch {
    return undefined;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('File storage is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open template storage.'));
  });
}

async function saveTemplateFileLocal(templateId: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(dataUrl, templateId);
  });
  db.close();
}

async function loadTemplateFileLocal(templateId: string): Promise<string | undefined> {
  const db = await openDb();
  const value = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(templateId);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

async function loadTemplateFileRemote(templateId: string): Promise<string | undefined> {
  if (typeof fetch === 'undefined') return undefined;
  try {
    const res = await fetch(`/api/rms/templates/file?id=${encodeURIComponent(templateId)}`);
    if (!res.ok) return undefined;
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/json')) return undefined;
    const blob = await res.blob();
    if (!blob.size) return undefined;
    return blobToDataUrl(blob);
  } catch {
    return undefined;
  }
}

export async function saveTemplateFile(
  templateId: string,
  dataUrl: string,
  options?: { persistRemote?: boolean }
): Promise<string | undefined> {
  await saveTemplateFileLocal(templateId, dataUrl);
  if (options?.persistRemote === false) return undefined;
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append('templateId', templateId);
  form.append('file', new File([blob], `${templateId}.pptx`, { type: blob.type }));
  const res = await fetch('/api/rms/templates/file', { method: 'POST', body: form });
  const data = (await res.json()) as { ok?: boolean; storagePath?: string; error?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Could not store the template file on the server.');
  }
  return data.storagePath;
}

export async function loadTemplateFile(templateId: string): Promise<string | undefined> {
  if (templateId === BUNDLED_DEFAULT_TEMPLATE_ID) {
    const bundled = await loadBundledDefaultPptx();
    if (bundled) return bundled;
  }
  const local = await loadTemplateFileLocal(templateId).catch(() => undefined);
  if (local) return local;
  const remote = await loadTemplateFileRemote(templateId);
  if (remote) {
    await saveTemplateFileLocal(templateId, remote).catch(() => undefined);
    return remote;
  }
  return undefined;
}

export async function deleteTemplateFile(templateId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(templateId);
    });
    db.close();
  } catch {
    // Local cache may already be empty.
  }
  if (typeof fetch !== 'undefined') {
    await fetch(`/api/rms/templates/file?id=${encodeURIComponent(templateId)}`, { method: 'DELETE' }).catch(
      () => undefined
    );
  }
}
