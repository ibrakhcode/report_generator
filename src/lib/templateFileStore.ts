const DB_NAME = 'hesu_template_files_v1';
const STORE = 'files';

export const BUNDLED_DEFAULT_TEMPLATE_ID = 'TMPL-ICT-2026';
export const BUNDLED_DEFAULT_PPTX_NAME = 'ICT_Monthly_Report_2026.pptx';
export const BUNDLED_DEFAULT_PPTX_PATH = '/templates/ICT_Monthly_Report_2026.pptx';

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
    await saveTemplateFile(BUNDLED_DEFAULT_TEMPLATE_ID, dataUrl);
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

export async function saveTemplateFile(templateId: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(dataUrl, templateId);
  });
  db.close();
}

export async function loadTemplateFile(templateId: string): Promise<string | undefined> {
  const db = await openDb();
  const value = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(templateId);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (value) return value;
  if (templateId === BUNDLED_DEFAULT_TEMPLATE_ID) {
    return loadBundledDefaultPptx();
  }
  return undefined;
}

export async function deleteTemplateFile(templateId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(templateId);
  });
  db.close();
}
