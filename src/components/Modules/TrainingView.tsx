'use client';

import React, { useState } from 'react';
import { BookOpen, Plus, Users, Star, Calendar, FileText, X } from 'lucide-react';
import { TrainingRecord } from '../../types';
import { storage } from '../../services/storage';
import { notify } from '@/lib/systemNotify';

export const TrainingView: React.FC = () => {
  const [trainings, setTrainings] = useState<TrainingRecord[]>(() => storage.getTraining());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<TrainingRecord>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    topic: '',
    targetAudience: 'Warehouse & Logistics Staff',
    participantCount: 15,
    learningObjectives: '',
    feedbackScore: 4.8,
    followUpActions: '',
    evidenceFiles: []
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    const toSave: TrainingRecord = {
      id: formData.id || `TRN-2026-${String(trainings.length + 1).padStart(2, '0')}`,
      title: formData.title || '',
      date: formData.date || new Date().toISOString().split('T')[0],
      topic: formData.topic || '',
      targetAudience: formData.targetAudience || '',
      participantCount: Number(formData.participantCount) || 1,
      learningObjectives: formData.learningObjectives || '',
      feedbackScore: Number(formData.feedbackScore) || 5,
      followUpActions: formData.followUpActions || '',
      evidenceFiles: formData.evidenceFiles || [],
      signedDocumentName: formData.signedDocumentName,
      signedDocumentDataUrl: formData.signedDocumentDataUrl,
      signedDocumentType: formData.signedDocumentType,
      createdAt: new Date().toISOString()
    };

    storage.saveTraining(toSave);
    setTrainings(storage.getTraining());
    setIsModalOpen(false);
    notify.success('Training saved', `${toSave.title} is in place.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Staff Training & Knowledge Sharing</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-purple-400 font-mono border border-slate-700">
              {trainings.length} sessions delivered
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Conduct and record cybersecurity hygiene seminars, end-user training, and attendance evidence.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-purple-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Record Training Session</span>
        </button>
      </div>

      {trainings.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto text-xl">
            🎓
          </div>
          <h3 className="text-base font-bold text-white">No Training Sessions Recorded Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Record cybersecurity awareness seminars, phishing defense drills, system workshops, and attendance sheets.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Record Training Session</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trainings.map((tr) => (
            <div
              key={tr.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-bold text-purple-400">{tr.id}</span>
                  <h3 className="text-sm font-bold text-white mt-1">{tr.title}</h3>
                </div>
                <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{tr.feedbackScore} / 5.0</span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-1.5">
                <div>
                  <span className="text-slate-400 font-medium">Topic: </span>
                  {tr.topic}
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Audience: </span>
                  {tr.targetAudience} ({tr.participantCount} staff attendees)
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Objectives: </span>
                  {tr.learningObjectives}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-700/60">
                <span>Date: {tr.date}</span>
                {tr.signedDocumentDataUrl ? (
                  <a
                    href={tr.signedDocumentDataUrl}
                    download={tr.signedDocumentName || 'signed-document'}
                    className="text-purple-400 font-semibold"
                  >
                    Signed document: {tr.signedDocumentName}
                  </a>
                ) : (
                  <span>No signed document attached</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white">Record Training Session</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Identifying Spear Phishing & Invoice Fraud"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Session Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Participants Count</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.participantCount}
                    onChange={(e) => setFormData({ ...formData, participantCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Department / Audience</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="e.g. Finance, Procurement & Warehouse Teams"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Learning Objectives</label>
                <textarea
                  rows={2}
                  value={formData.learningObjectives}
                  onChange={(e) => setFormData({ ...formData, learningObjectives: e.target.value })}
                  placeholder="Key concepts, checklists, and skills acquired..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Signed document (optional)</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      setFormData({
                        ...formData,
                        signedDocumentName: undefined,
                        signedDocumentDataUrl: undefined,
                        signedDocumentType: undefined
                      });
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setFormData({
                        ...formData,
                        signedDocumentName: file.name,
                        signedDocumentDataUrl: String(reader.result || ''),
                        signedDocumentType: file.type
                      });
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="w-full text-slate-300"
                />
                {formData.signedDocumentName && (
                  <p className="text-[11px] text-emerald-400 mt-1">Attached: {formData.signedDocumentName}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  Save Training Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
