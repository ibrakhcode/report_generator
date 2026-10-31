'use client';

import React, { useState } from 'react';
import { Layers, Plus, CheckSquare, Clock, Calendar, CheckCircle2, ChevronRight, X, Eye } from 'lucide-react';
import { ProjectImprovement, ProjectMilestone } from '../../types';
import { storage } from '../../services/storage';
import { notify } from '@/lib/systemNotify';
import { SuggestField } from '@/components/System/SuggestField';
import { DetailRow, RecordDetailDialog } from '@/components/System/RecordDetailDialog';

export const ProjectsView: React.FC = () => {
  const [projects, setProjects] = useState<ProjectImprovement[]>(() => storage.getProjects());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<ProjectImprovement | null>(null);

  const users = storage.getCompanyUsers().filter((user) => user.active !== false);
  const emptyProject = (): Partial<ProjectImprovement> => ({
    name: '',
    objective: '',
    businessJustification: '',
    startDate: new Date().toISOString().split('T')[0],
    targetCompletionDate: '2026-11-30',
    owner: users[0]?.fullName || '',
    assignedUserId: users[0]?.id || '',
    assignedUserName: users[0]?.fullName || '',
    myResponsibilities: '',
    status: 'Active',
    milestones: [
      { id: 'M-1', title: 'Architecture design & prerequisites', targetDate: '2026-10-25', status: 'Completed', weightPercent: 30 },
      { id: 'M-2', title: 'Implementation and system testing', targetDate: '2026-11-10', status: 'In Progress', weightPercent: 40 },
      { id: 'M-3', title: 'Documentation & final handover', targetDate: '2026-11-30', status: 'Pending', weightPercent: 30 }
    ],
    risksAndDependencies: '',
    benefitsAndOutcomes: '',
    approvalStatus: 'Approved',
    evidenceFiles: []
  });
  const [formData, setFormData] = useState<Partial<ProjectImprovement>>(emptyProject);

  const handleOpenCreate = () => {
    setFormData(emptyProject());
    setIsModalOpen(true);
  };

  const handleToggleMilestone = (project: ProjectImprovement, milestoneId: string) => {
    const updatedMilestones = project.milestones.map((m) => {
      if (m.id === milestoneId) {
        const nextStatus = m.status === 'Completed' ? 'In Progress' : 'Completed';
        return {
          ...m,
          status: nextStatus as ProjectMilestone['status'],
          completedDate: nextStatus === 'Completed' ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return m;
    });

    const updatedProject = { ...project, milestones: updatedMilestones };
    storage.saveProject(updatedProject);
    void storage.waitForLastPersist().then((saved) => {
      setProjects(storage.getProjects());
      if (!saved) {
        notify.error(
          'Milestone change was not stored',
          storage.getLastPersistError() || 'Check the server connection and try again.'
        );
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const toSave: ProjectImprovement = {
      id: formData.id || `PRJ-2026-${String(projects.length + 1).padStart(3, '0')}`,
      name: formData.name || '',
      objective: formData.objective || '',
      businessJustification: formData.businessJustification || '',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      targetCompletionDate: formData.targetCompletionDate || '',
      owner: formData.assignedUserName || formData.owner || '',
      assignedUserId: formData.assignedUserId || '',
      assignedUserName: formData.assignedUserName || formData.owner || '',
      myResponsibilities: formData.myResponsibilities || '',
      status: formData.status || 'Active',
      milestones: formData.milestones || [],
      progressPercent: formData.progressPercent || 0,
      risksAndDependencies: formData.risksAndDependencies || '',
      benefitsAndOutcomes: formData.benefitsAndOutcomes || '',
      approvalStatus: formData.approvalStatus || 'Approved',
      evidenceFiles: formData.evidenceFiles || [],
      lessonsLearned: formData.lessonsLearned,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storage.saveProject(toSave);
    const saved = await storage.waitForLastPersist();
    setProjects(storage.getProjects());
    if (!saved) {
      notify.error(
        'Project is on this screen, but not in the database',
        storage.getLastPersistError() || 'Check the server connection and try Save again.'
      );
      return;
    }
    setIsModalOpen(false);
    notify.success('Project saved', `${toSave.name} is stored in the database.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Projects & Continuous Improvements</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-400 font-mono border border-slate-700">
              {projects.length} strategic initiatives
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track disaster recovery readiness, server room modernization, and enterprise biometrics with milestone weighting.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-teal-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Project Initiative</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto text-xl">
            🚀
          </div>
          <h3 className="text-base font-bold text-white">No Project Initiatives Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Record continuous improvements, IT infrastructure upgrades, disaster recovery tests, or ERP enhancements with weighted milestone tracking.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-lg shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Project</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((proj) => (
          <div
            key={proj.id}
            className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-400">{proj.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20">
                    {proj.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    Target: {proj.targetCompletionDate}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1.5">{proj.name}</h3>
                <p className="text-xs text-slate-300 mt-1">{proj.objective}</p>
              </div>

              <div className="text-right sm:shrink-0 space-y-2">
                <div className="text-2xl font-black text-teal-400 font-mono">
                  {proj.progressPercent}%
                </div>
                <div className="text-[11px] text-slate-400">Milestone Progress</div>
                <button
                  type="button"
                  onClick={() => setViewingProject(proj)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${proj.progressPercent}%` }}
              />
            </div>

            {/* Milestones list with interactive toggle */}
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <div className="text-xs font-bold text-slate-300">Deliverables & Milestones:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {proj.milestones?.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleToggleMilestone(proj, m.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-left transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          m.status === 'Completed'
                            ? 'bg-teal-500 border-teal-400 text-slate-950 font-bold'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {m.status === 'Completed' && '✓'}
                      </div>
                      <span className={`font-medium ${m.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                        {m.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                      {m.weightPercent}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/60 gap-2">
              <div>
                Assigned to:{' '}
                <span className="text-slate-200 font-medium">{proj.assignedUserName || proj.owner || 'Unassigned'}</span>
              </div>
              <div>Benefits: <span className="text-slate-300">{proj.benefitsAndOutcomes}</span></div>
            </div>
          </div>
        ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white">
                {formData.id ? `Edit Project: ${formData.id}` : 'Create Project Initiative'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Automated Offsite Cloud Disaster Recovery"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Objective</label>
                <input
                  type="text"
                  required
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="e.g. Continuous log shipping and RTO reduction"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Completion</label>
                  <input
                    type="date"
                    required
                    value={formData.targetCompletionDate}
                    onChange={(e) => setFormData({ ...formData, targetCompletionDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <SuggestField
                  label="Who will perform this project"
                  required
                  value={formData.assignedUserId || ''}
                  onChange={(next) => {
                    const selected = users.find((user) => user.id === next);
                    setFormData({
                      ...formData,
                      assignedUserId: next,
                      assignedUserName: selected?.fullName || next,
                      owner: selected?.fullName || next
                    });
                  }}
                  allowCustom
                  placeholder="Type a name"
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.fullName,
                    hint: user.email
                  }))}
                />
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingProject && (
        <RecordDetailDialog
          title={`Project ${viewingProject.id}`}
          onClose={() => setViewingProject(null)}
          onEdit={() => {
            setFormData(viewingProject);
            setViewingProject(null);
            setIsModalOpen(true);
          }}
        >
          <DetailRow label="Name" value={viewingProject.name} />
          <DetailRow label="Objective" value={viewingProject.objective} />
          <DetailRow label="Business justification" value={viewingProject.businessJustification} />
          <DetailRow label="Owner" value={viewingProject.owner} />
          <DetailRow label="Assigned to" value={viewingProject.assignedUserName} />
          <DetailRow label="My responsibilities" value={viewingProject.myResponsibilities} />
          <DetailRow label="Start date" value={viewingProject.startDate} />
          <DetailRow label="Target completion" value={viewingProject.targetCompletionDate} />
          <DetailRow label="Status" value={viewingProject.status} />
          <DetailRow label="Approval" value={viewingProject.approvalStatus} />
          <DetailRow label="Progress" value={`${viewingProject.progressPercent}%`} />
          <DetailRow label="Risks and dependencies" value={viewingProject.risksAndDependencies} />
          <DetailRow label="Benefits and outcomes" value={viewingProject.benefitsAndOutcomes} />
          <DetailRow label="Estimated cost" value={viewingProject.estimatedCost} />
          <DetailRow label="Lessons learned" value={viewingProject.lessonsLearned} />
          <DetailRow
            label="Milestones"
            value={
              viewingProject.milestones?.length
                ? viewingProject.milestones
                    .map((item) => `${item.title} (${item.status}, ${item.weightPercent}%)`)
                    .join('\n')
                : ''
            }
          />
          <DetailRow label="Evidence files" value={viewingProject.evidenceFiles?.filter(Boolean).join(', ')} />
          <DetailRow label="Created" value={viewingProject.createdAt} />
          <DetailRow label="Updated" value={viewingProject.updatedAt} />
        </RecordDetailDialog>
      )}
    </div>
  );
};
