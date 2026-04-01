import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

export interface DiagnosticSituation {
  ownerType?: 'occupant' | 'bailleur'
  householdSize?: number
  revenueProfile?: RevenueProfile | null
  knowsRevenue?: boolean
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
  // ID du diagnostic en base (null si pas encore sauvé)
  draftId: string | null
  step: number
  selectedTypes: DiagnosticType[]
  property: DiagnosticProperty
  situation: DiagnosticSituation
  equipment: DiagnosticEquipment
  symptoms: Record<DiagnosticType, string[]>
  contact: DiagnosticContact

  setDraftId: (id: string | null) => void
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
  /** Restaurer un brouillon depuis la DB */
  restoreDraft: (draft: {
    id: string
    step: number
    selectedTypes: DiagnosticType[]
    property: DiagnosticProperty
    equipment: DiagnosticEquipment
    symptoms: Record<DiagnosticType, string[]>
  }) => void
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
  draftId: null as string | null,
  step: 1,
  selectedTypes: [] as DiagnosticType[],
  property: {} as DiagnosticProperty,
  situation: {} as DiagnosticSituation,
  equipment: {} as DiagnosticEquipment,
  symptoms: { ...initialSymptoms },
  contact: {} as DiagnosticContact,
}

export const useDiagnosticStore = create<DiagnosticState>()(
  persist(
    (set) => ({
      ...initialState,

      setDraftId: (id) => set({ draftId: id }),

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

      restoreDraft: (draft) =>
        set({
          draftId: draft.id,
          step: draft.step,
          selectedTypes: draft.selectedTypes,
          property: draft.property,
          equipment: draft.equipment,
          symptoms: { ...initialSymptoms, ...draft.symptoms },
        }),

      reset: () => set({ ...initialState, symptoms: { ...initialSymptoms } }),
    }),
    {
      name: 'brh-diagnostic-draft',
      // Ne persister que les données du diagnostic, pas les fonctions
      partialize: (state) => ({
        draftId: state.draftId,
        step: state.step,
        selectedTypes: state.selectedTypes,
        property: state.property,
        situation: state.situation,
        equipment: state.equipment,
        symptoms: state.symptoms,
        contact: state.contact,
      }),
    },
  ),
)
