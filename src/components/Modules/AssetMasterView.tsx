'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Package } from 'lucide-react';
import { AssetDefinition, AssetField, AssetFieldType, AssetRecord } from '@/types';
import { storage } from '@/services/storage';
import { useAutoSave, useAutoSaveEnabled } from '@/hooks/useAutoSave';
import { notify } from '@/lib/systemNotify';

const FIELD_TYPES: AssetFieldType[] = ['text', 'number', 'date', 'textarea', 'select'];

const emptyDefinition = (): AssetDefinition => ({
  id: `AST-TYPE-${Date.now()}`,
  name: '',
  description: '',
  fields: [{ id: `fld-${Date.now()}`, label: '', type: 'text', required: true }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export function AssetMasterView() {
  const autoSave = useAutoSaveEnabled();
  const [definitions, setDefinitions] = useState<AssetDefinition[]>(() => storage.getAssetDefinitions());
  const [records, setRecords] = useState<AssetRecord[]>(() => storage.getAssetRecords());
  const [tab, setTab] = useState<'define' | 'record'>('define');
  const [definition, setDefinition] = useState<AssetDefinition>(emptyDefinition);
  const [selectedTypeId, setSelectedTypeId] = useState(definitions[0]?.id || '');
  const [recordName, setRecordName] = useState('');
  const [recordValues, setRecordValues] = useState<Record<string, string>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedType = useMemo(
    () => definitions.find((item) => item.id === selectedTypeId) || definitions[0],
    [definitions, selectedTypeId]
  );

  const persistDefinition = useCallback(() => {
    if (!definition.name.trim()) return;
    const saved = storage.saveAssetDefinition({
      ...definition,
      name: definition.name.trim(),
      fields: definition.fields.filter((field) => field.label.trim())
    });
    setDefinition(saved);
    setDefinitions(storage.getAssetDefinitions());
  }, [definition]);

  useAutoSave(autoSave && tab === 'define', definition, persistDefinition);

  const persistRecord = useCallback(() => {
    if (!selectedType || !recordName.trim()) return;
    const missing = selectedType.fields.filter((field) => field.required && !String(recordValues[field.id] || '').trim());
    if (missing.length > 0) return;
    const saved = storage.saveAssetRecord({
      id: editingRecordId || `AST-${Date.now()}`,
      definitionId: selectedType.id,
      name: recordName.trim(),
      values: recordValues,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setEditingRecordId(saved.id);
    setRecords(storage.getAssetRecords());
  }, [selectedType, recordName, recordValues, editingRecordId]);

  useAutoSave(
    autoSave && tab === 'record' && Boolean(editingRecordId),
    { recordName, recordValues, selectedTypeId, editingRecordId },
    persistRecord
  );

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2500);
    if (text.toLowerCase().includes('enter') || text.toLowerCase().includes('fill') || text.toLowerCase().includes('define')) {
      notify.warning('Check the form', text);
    } else {
      notify.success('Saved', text);
    }
  };

  const addField = () => {
    setDefinition({
      ...definition,
      fields: [...definition.fields, { id: `fld-${Date.now()}`, label: '', type: 'text', required: true }]
    });
  };

  const updateField = (id: string, patch: Partial<AssetField>) => {
    setDefinition({
      ...definition,
      fields: definition.fields.map((field) => (field.id === id ? { ...field, ...patch } : field))
    });
  };

  const startNewType = () => {
    setDefinition(emptyDefinition());
  };

  const loadType = (item: AssetDefinition) => {
    setDefinition(item);
    setSelectedTypeId(item.id);
  };

  const saveType = () => {
    if (!definition.name.trim()) {
      flash('Enter an asset type name.');
      return;
    }
    persistDefinition();
    flash('Asset type saved.');
  };

  const saveRecord = () => {
    if (!selectedType) {
      flash('Define an asset type first.');
      return;
    }
    if (!recordName.trim()) {
      flash('Enter the asset name.');
      return;
    }
    const missing = selectedType.fields.filter((field) => field.required && !String(recordValues[field.id] || '').trim());
    if (missing.length > 0) {
      flash(`Fill required data: ${missing.map((field) => field.label).join(', ')}`);
      return;
    }
    const wasNew = !editingRecordId;
    persistRecord();
    if (wasNew) {
      setEditingRecordId(null);
      setRecordName('');
      setRecordValues({});
    }
    flash(
      selectedType.systemKey === 'company'
        ? 'Company saved. It is now Live-selectable in the top bar.'
        : wasNew
          ? 'Saved. You can add another department or asset below.'
          : 'Asset record updated.'
    );
  };

  const startNewRecord = () => {
    setEditingRecordId(null);
    setRecordName('');
    setRecordValues({});
  };

  const editRecord = (item: AssetRecord) => {
    setTab('record');
    setSelectedTypeId(item.definitionId);
    setEditingRecordId(item.id);
    setRecordName(item.name);
    setRecordValues(item.values || {});
  };

  const typeRecords = records.filter((item) => !selectedType || item.definitionId === selectedType.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-400" />
            <span>Master Assets</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Define Company, Department, Device (and any other type), then record data. Tickets and daily work use the selected company.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('define')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold ${
              tab === 'define' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            Define types
          </button>
          <button
            type="button"
            onClick={() => setTab('record')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold ${
              tab === 'record' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            Record assets
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">{message}</div>
      )}

      {tab === 'define' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Asset types</h3>
              <button type="button" onClick={startNewType} className="text-xs text-teal-400 inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>
            {definitions.length === 0 && <p className="text-xs text-slate-500">No types yet. Add a name and required data.</p>}
            {definitions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => loadType(item)}
                className={`w-full text-left rounded-xl px-3 py-2.5 text-sm ${
                  definition.id === item.id ? 'bg-teal-500/15 text-teal-300' : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="block font-semibold">{item.name}</span>
                <span className="block text-[11px] text-slate-400">
                  {item.systemKey ? `System type · ${item.fields.length} fields` : `${item.fields.length} data fields`}
                </span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Asset type name *</label>
              <input
                value={definition.name}
                onChange={(e) => setDefinition({ ...definition, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                placeholder="e.g. Laptop, Printer, Vehicle"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Description</label>
              <textarea
                rows={2}
                value={definition.description}
                onChange={(e) => setDefinition({ ...definition, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Data required</h4>
                <button type="button" onClick={addField} className="text-xs text-teal-400 inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Add field
                </button>
              </div>
              {definition.fields.map((field) => (
                <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    placeholder="Field name"
                    className="sm:col-span-4 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as AssetFieldType })}
                    className="sm:col-span-3 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {field.type === 'select' && (
                    <input
                      value={field.options || ''}
                      onChange={(e) => updateField(field.id, { options: e.target.value })}
                      placeholder="Options, comma separated"
                      className="sm:col-span-3 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  )}
                  <label className="sm:col-span-1 flex items-center gap-1 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                    />
                    Req
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDefinition({ ...definition, fields: definition.fields.filter((item) => item.id !== field.id) })
                    }
                    className="sm:col-span-1 p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={Boolean(definition.systemKey)}
                onClick={async () => {
                  if (definition.systemKey) return;
                  const ok = await notify.confirm('Delete asset type', 'Delete this asset type and its records?', 'Delete');
                  if (!ok) return;
                  storage.deleteAssetDefinition(definition.id);
                  setDefinitions(storage.getAssetDefinitions());
                  setRecords(storage.getAssetRecords());
                  startNewType();
                  notify.success('Type deleted', 'The asset type was removed.');
                }}
                className={`text-xs ${definition.systemKey ? 'text-slate-600 cursor-not-allowed' : 'text-rose-400'}`}
              >
                {definition.systemKey ? 'System type' : 'Delete type'}
              </button>
              <button
                type="button"
                onClick={saveType}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save type
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'record' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
            {selectedType?.systemKey !== 'company' && (
              <p className="text-[11px] text-slate-400">
                Recording for <span className="text-teal-300 font-semibold">{storage.getSettings().companyName || 'the selected company'}</span>. Switch company in the top bar to work in another workspace.
              </p>
            )}
            {selectedType?.systemKey === 'company' && (
              <p className="text-[11px] text-slate-400">
                Companies are shared. After you add a company, select it in the top bar to work with empty data for that organization.
              </p>
            )}
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Asset type</label>
              <select
                value={selectedType?.id || ''}
                onChange={(e) => {
                  setSelectedTypeId(e.target.value);
                  setEditingRecordId(null);
                  setRecordName('');
                  setRecordValues({});
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
              >
                {definitions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            {!selectedType && <p className="text-xs text-slate-500">Define an asset type first.</p>}
            {selectedType && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Asset name *</label>
                  <input
                    value={recordName}
                    onChange={(e) => setRecordName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                    placeholder={
                      selectedType.systemKey === 'department'
                        ? 'e.g. Finance'
                        : selectedType.systemKey === 'device'
                          ? 'e.g. Dell Latitude 5430'
                          : 'Asset name'
                    }
                  />
                </div>
                {selectedType.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs text-slate-400 font-semibold mb-1">
                      {field.label || 'Untitled field'}
                      {field.required ? ' *' : ''}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={recordValues[field.id] || ''}
                        onChange={(e) => setRecordValues({ ...recordValues, [field.id]: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={recordValues[field.id] || ''}
                        onChange={(e) => setRecordValues({ ...recordValues, [field.id]: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                      >
                        <option value="">Select</option>
                        {(field.options || '')
                          .split(',')
                          .map((opt) => opt.trim())
                          .filter(Boolean)
                          .map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        value={recordValues[field.id] || ''}
                        onChange={(e) => setRecordValues({ ...recordValues, [field.id]: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                      />
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startNewRecord}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add another
                  </button>
                  <button
                    type="button"
                    onClick={saveRecord}
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold inline-flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingRecordId ? 'Update' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Required data</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {typeRecords.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      No assets recorded yet.
                    </td>
                  </tr>
                )}
                {typeRecords.map((item) => {
                  const type = definitions.find((def) => def.id === item.definitionId);
                  return (
                    <tr key={item.id}>
                      <td className="py-3 px-4 font-semibold text-white">{item.name}</td>
                      <td className="py-3 px-4">{type?.name || 'Unknown'}</td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        {(type?.fields || [])
                          .map((field) => `${field.label}: ${item.values[field.id] || '-'}`)
                          .join(' · ')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button type="button" onClick={() => editRecord(item)} className="text-teal-400 mr-2">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await notify.confirm('Delete asset', `Delete ${item.name}?`, 'Delete');
                            if (!ok) return;
                            storage.deleteAssetRecord(item.id);
                            setRecords(storage.getAssetRecords());
                            notify.success('Asset deleted', `${item.name} was removed.`);
                          }}
                          className="text-rose-400"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
