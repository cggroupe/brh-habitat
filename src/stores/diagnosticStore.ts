import { create } from 'zustand'

export type DiagnosticType =
  | 'humidite'
  | 'isolation'
  | 'ventilation'
  | 'menuiseries'
  | 'electricite'
  | 'toiture'
  | 'plomberie'

interface DiagnosticProperty {
  type?: string
  address?: string
  surface?: number
  year?: number
  floors?: number
}

export interface DiagnosticEquipment {
  heatingType?: string
  ventilationType?: string
  windowType?: string
  roofType?: string
  dpeRating?: string
  lastRenovation?: string
}

interface DiagnosticContact {
  name?: string
  phone?: string
  email?: string
}

interface DiagnosticState {
  step: number
  selectedTypes: DiagnosticType[]
  property: DiagnosticProperty
  equipment: DiagnosticEquipment
  symptoms: Record<DiagnosticType, string[]>
  photos: File[]
  contact: DiagnosticContact

  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  toggleType: (type: DiagnosticType) => void
  setProperty: (data: Partial<DiagnosticProperty>) => void
  setEquipment: (data: Partial<DiagnosticEquipment>) => void
  toggleSymptom: (type: DiagnosticType, symptom: string) => void
  addPhoto: (file: File) => void
  removePhoto: (index: number) => void
  setContact: (data: Partial<DiagnosticContact>) => void
  reset: () => void
}

const initialSymptoms: Record<DiagnosticType, string[]> = {
  humidite: [],
  isolation: [],
  ventilation: [],
  menuiseries: [],
  electricite: [],
  toiture: [],
  plomberie: [],
}

const initialState = {
  step: 1,
  selectedTypes: [] as DiagnosticType[],
  property: {} as DiagnosticProperty,
  equipment: {} as DiagnosticEquipment,
  symptoms: { ...initialSymptoms },
  photos: [] as File[],
  contact: {} as DiagnosticContact,
}

export const useDiagnosticStore = create<DiagnosticState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  nextStep: () =>
    set((state) => ({ step: Math.min(state.step + 1, 6) })),

  prevStep: () =>
    set((state) => ({ step: Math.max(state.step - 1, 1) })),

  toggleType: (type) =>
    set((state) => {
      const exists = state.selectedTypes.includes(type)
      return {
        selectedTypes: exists
          ? state.selectedTypes.filter((t) => t !== type)
          : [...state.selectedTypes, type],
      }
    }),

  setProperty: (data) =>
    set((state) => ({
      property: { ...state.property, ...data },
    })),

  setEquipment: (data) =>
    set((state) => ({
      equipment: { ...state.equipment, ...data },
    })),

  toggleSymptom: (type, symptom) =>
    set((state) => {
      const current = state.symptoms[type] ?? []
      const exists = current.includes(symptom)
      return {
        symptoms: {
          ...state.symptoms,
          [type]: exists
            ? current.filter((s) => s !== symptom)
            : [...current, symptom],
        },
      }
    }),

  addPhoto: (file) =>
    set((state) => ({
      photos: [...state.photos, file],
    })),

  removePhoto: (index) =>
    set((state) => ({
      photos: state.photos.filter((_, i) => i !== index),
    })),

  setContact: (data) =>
    set((state) => ({
      contact: { ...state.contact, ...data },
    })),

  reset: () => set({ ...initialState, symptoms: { ...initialSymptoms } }),
}))
