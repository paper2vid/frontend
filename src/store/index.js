import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // Active pipeline jobs being tracked
  activeJobs: {},   // taskId -> { status, stage, paper_id, progress, logs[] }

  addJob: (taskId, paperInfo) =>
    set(s => ({
      activeJobs: {
        ...s.activeJobs,
        [taskId]: { status: 'queued', stage: 'pending', logs: [], ...paperInfo },
      },
    })),

  updateJob: (taskId, update) =>
    set(s => ({
      activeJobs: {
        ...s.activeJobs,
        [taskId]: { ...s.activeJobs[taskId], ...update },
      },
    })),

  appendLog: (taskId, log) =>
    set(s => ({
      activeJobs: {
        ...s.activeJobs,
        [taskId]: {
          ...s.activeJobs[taskId],
          logs: [...(s.activeJobs[taskId]?.logs || []), log],
        },
      },
    })),

  removeJob: (taskId) =>
    set(s => {
      const { [taskId]: _, ...rest } = s.activeJobs
      return { activeJobs: rest }
    }),

  // Selected paper for detail view
  selectedPaperId: null,
  setSelectedPaper: (id) => set({ selectedPaperId: id }),
}))
