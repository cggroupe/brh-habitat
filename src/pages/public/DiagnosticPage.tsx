import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { analyzeDiagnostic } from '@/lib/diagnostic-engine'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

import { HorizontalStepper } from './diagnostic/HorizontalStepper'
import { SidePanel } from './diagnostic/SidePanel'
import { NavFooter } from './diagnostic/NavFooter'
import { StepTypes } from './diagnostic/StepTypes'
import { StepProperty } from './diagnostic/StepProperty'
import { StepSituation } from './diagnostic/StepSituation'
import { StepEquipment } from './diagnostic/StepEquipment'
import { StepSymptoms } from './diagnostic/StepSymptoms'
import { StepContact } from './diagnostic/StepContact'

// Steps : 1-Types | 2-Logement | 3-Situation | 4-Equipements | 5-Symptomes | 6-Contact
const STEP_LABELS = ['Domaines', 'Logement', 'Situation', 'Equipements', 'Symptomes', 'Contact']

export default function DiagnosticPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Controle l'affichage de l'erreur annee (step 2)
  const [showYearError, setShowYearError] = useState(false)

  const {
    step,
    nextStep,
    prevStep,
    selectedTypes,
    property,
    situation,
    equipment,
    symptoms,
    contact,
    reset,
  } = useDiagnosticStore()

  // Validation par step
  const canProceed = (() => {
    if (step === 1) return selectedTypes.length > 0
    if (step === 2) return !!property.year   // annee obligatoire
    if (step === 3) return true
    if (step === 4) return true
    if (step === 5) return true
    if (step === 6) {
      return (
        (contact.name?.trim().length ?? 0) > 0 &&
        (contact.phone?.trim().length ?? 0) > 0 &&
        (contact.email?.trim().length ?? 0) > 0
      )
    }
    return false
  })()

  const handleNext = () => {
    if (step === 2 && !property.year) {
      setShowYearError(true)
      return
    }
    setShowYearError(false)
    nextStep()
  }

  const handlePrev = () => {
    setShowYearError(false)
    prevStep()
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const results = analyzeDiagnostic(selectedTypes, symptoms, property.year, equipment)

      const payload = {
        user_id: user?.id ?? null,
        types: selectedTypes as string[],
        property_type: property.type ?? '',
        property_address: property.address ?? '',
        property_surface: property.surface ?? 0,
        property_year: property.year ?? 0,
        property_floors: property.floors ?? 0,
        owner_type: situation.ownerType ?? null,
        household_size: situation.householdSize ?? null,
        revenue_profile: situation.revenueProfile ?? null,
        symptoms: symptoms as Record<string, string[]>,
        contact_name: contact.name ?? '',
        contact_phone: contact.phone ?? '',
        contact_email: contact.email ?? '',
        results: results as unknown as Record<string, unknown>,
        status: 'pending' as const,
        admin_notes: null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('brh_diagnostics')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        console.error('Supabase error:', error)
        navigate('/diagnostic/resultats/local', { state: { results } })
        reset()
        return
      }

      navigate(`/diagnostic/resultats/${(data as { id: string }).id}`, { state: { results } })
      reset()
    } catch (err) {
      console.error('Submit error:', err)
      setSubmitError('Une erreur est survenue. Veuillez reessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-[1200px] mx-auto p-8 flex gap-8 items-start">

        {/* Colonne gauche : Stepper + Carte centrale */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">

          {/* Stepper horizontal avec labels mis a jour */}
          <HorizontalStepper step={step} stepLabels={STEP_LABELS} />

          {/* Carte centrale */}
          <div className="max-w-[700px] w-full mx-auto bg-white rounded-xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
            {step === 1 && <StepTypes />}
            {step === 2 && <StepProperty showYearError={showYearError} />}
            {step === 3 && <StepSituation />}
            {step === 4 && <StepEquipment />}
            {step === 5 && <StepSymptoms />}
            {step === 6 && <StepContact onSubmit={handleSubmit} isSubmitting={isSubmitting} />}

            {submitError && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {submitError}
              </p>
            )}

            <NavFooter
              step={step}
              canProceed={canProceed}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          </div>
        </div>

        {/* Panneau lateral — visible a partir de lg */}
        <div className="hidden lg:block">
          <SidePanel step={step} />
        </div>
      </div>
    </div>
  )
}
