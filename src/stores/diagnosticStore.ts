import { create } from 'zustand'
import type { RevenueProfile } from '@/data/aides-renov'

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

// ---------------------------------------------------------------------------
// Nouvelle section Situation (step 3 — entre Propriete et Equipements)
// ---------------------------------------------------------------------------
// Steps : 1-Types | 2-Propriete | 3-Situation | 4-Equipements | 5-Symptomes
// Le contact est collecte via modal sur la page de resultats (ContactRdvModal)

export interface DiagnosticSituation {
  ownerType?: 'occupant' | 'bailleur'
  householdSize?: number        // 1 a 5+
  revenueProfile?: RevenueProfile | null
  knowsRevenue?: boolean        // sait-il son revenu fiscal ?
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
  situation: DiagnosticSituation
  equipment: DiagnosticEquipment
  symptoms: Record<DiagnosticType, string[]>
  contact: DiagnosticContact

  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  toggleType: (type: DiagnosticType) => void
  setProperty: (data: Partial<DiagnosticProperty>) => void
  setSituation: (situation: DiagnosticSituation) => void
  updateSituation: (partial: Partial<DiagnosticSituation>) => void
  setEquipment: (data: Partial<DiagnosticEquipment>) => void
  toggleSymptom: (type: DiagnosticType, symptom: string) => void
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
  situation: {} as DiagnosticSituation,
  equipment: {} as DiagnosticEquipment,
  symptoms: { ...initialSymptoms },
  contact: {} as DiagnosticContact,
}

export const useDiagnosticStore = create<DiagnosticState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  nextStep: () =>
    set((state) => ({ step: Math.min(state.step + 1, 5) })),

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

  setSituation: (situation) => set({ situation }),

  updateSituation: (partial) =>
    set((state) => ({
      situation: { ...state.situation, ...partial },
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

  setContact: (data) =>
    set((state) => ({
      contact: { ...state.contact, ...data },
    })),

  reset: () => set({ ...initialState, symptoms: { ...initialSymptoms } }),
}))
