import { logError } from '@/lib/error'
import { useState, useCallback, useRef, useEffect } from 'react'
import { SEOHead } from '@/components/shared/SEOHead'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { analyzeDiagnostic } from '@/lib/diagnostic-engine'
import { upsertDraftDiagnostic } from '@/api/diagnostics'
import { useAuth } from '@/hooks/useAuth'

import { HorizontalStepper } from './diagnostic/HorizontalStepper'
import { SidePanel } from './diagnostic/SidePanel'
import { NavFooter } from './diagnostic/NavFooter'
import { StepTypes } from './diagnostic/StepTypes'
import { StepProperty } from './diagnostic/StepProperty'
import { StepSituation } from './diagnostic/StepSituation'
import { StepEquipment } from './diagnostic/StepEquipment'
import { StepSymptoms } from './diagnostic/StepSymptoms'

const STEP_LABELS = ['Domaines', 'Logement', 'Situation', 'Equipements', 'Symptomes']
const TOTAL_STEPS = 5

export default function DiagnosticPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showYearError, setShowYearError] = useState(false)

  // Ref pour éviter les sauvegardes concurrentes
  const savingRef = useRef(false)

  const {
    draftId,
    setDraftId,
    step,
    nextStep,
    prevStep,
    selectedTypes,
    property,
    equipment,
    symptoms,
    referralCode,
    setReferralCode,
    reset,
  } = useDiagnosticStore()

  // Capturer le code parrainage depuis l'URL (?ref=CODE)
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref && ref !== referralCode) {
      setReferralCode(ref)
    }
  }, [searchParams, referralCode, setReferralCode])

  // Sauvegarder le brouillon en DB (utilisateur connecté uniquement)
  const saveDraft = useCallback(async (nextStepValue?: number) => {
    if (!user?.id || savingRef.current) return
    savingRef.current = true

    try {
      const result = await upsertDraftDiagnostic(draftId, {
        user_id: user.id,
        types: selectedTypes as string[],
        property_type: property.type ?? '',
        property_address: property.address ?? '',
        property_surface: property.surface ?? 0,
        property_year: property.year ?? 0,
        property_floors: property.floors ?? 0,
        equipment: equipment as Record<string, unknown>,
        symptoms: symptoms as Record<string, string[]>,
        current_step: nextStepValue ?? step,
        status: 'draft' as const,
      })

      if (!draftId && result.id) {
        setDraftId(result.id)
      }
    } catch (err) {
      logError('Erreur sauvegarde brouillon', err)
    } finally {
      savingRef.current = false
    }
  }, [user?.id, draftId, selectedTypes, property, equipment, symptoms, step, setDraftId])

  // Sauvegarder automatiquement quand on change d'étape
  const prevStepRef = useRef(step)
  useEffect(() => {
    if (step !== prevStepRef.current) {
      prevStepRef.current = step
      saveDraft(step)
    }
  }, [step, saveDraft])

  // Validation par step
  const canProceed = (() => {
    if (step === 1) return selectedTypes.length > 0
    if (step === 2) return !!property.year
    if (step === 3) return true
    if (step === 4) return true
    if (step === 5) return true
    return false
  })()

  const handleNext = () => {
    if (step === 2 && !property.year) {
      setShowYearError(true)
      return
    }
    setShowYearError(false)
    if (step === TOTAL_STEPS) {
      handleSubmit()
      return
    }
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

      // Si on a un brouillon en DB, on le finalise
      if (draftId && user?.id) {
        try {
          await upsertDraftDiagnostic(draftId, {
            user_id: user.id,
            types: selectedTypes as string[],
            property_type: property.type ?? '',
            property_address: property.address ?? '',
            property_surface: property.surface ?? 0,
            property_year: property.year ?? 0,
            property_floors: property.floors ?? 0,
            equipment: equipment as Record<string, unknown>,
            symptoms: symptoms as Record<string, string[]>,
            current_step: 5,
            results: results as unknown as Record<string, unknown>,
            status: 'pending' as const,
            referral_code: referralCode ?? undefined,
          })

          navigate(`/diagnostic/resultats/${draftId}`, { state: { results } })
          reset()
          return
        } catch (err) {
          logError('Erreur finalisation brouillon', err)
        }
      }

      // Pas de brouillon existant ou erreur → créer un nouveau diagnostic
      const payload = {
        user_id: user?.id ?? null,
        types: selectedTypes as string[],
        property_type: property.type ?? '',
        property_address: property.address ?? '',
        property_surface: property.surface ?? 0,
        property_year: property.year ?? 0,
        property_floors: property.floors ?? 0,
        symptoms: symptoms as Record<string, string[]>,
        equipment: equipment as Record<string, unknown>,
        current_step: 5,
        photos: [] as string[],
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        results: results as unknown as Record<string, unknown>,
        status: 'pending' as const,
        admin_notes: null,
        referral_code: referralCode ?? null,
      }

      try {
        const { data, error } = await (await import('@/lib/supabase')).supabase
          .from('brh_diagnostics')
          .insert(payload)
          .select('id')
          .single()

        if (error) {
          logError('Supabase diagnostic error', error)
          navigate('/diagnostic/resultats/local', { state: { results } })
          reset()
          return
        }

        navigate(`/diagnostic/resultats/${data.id}`, { state: { results } })
        reset()
      } catch (fetchErr) {
        logError('Supabase diagnostic fetch error', fetchErr)
        navigate('/diagnostic/resultats/local', { state: { results } })
        reset()
      }
    } catch (err) {
      logError('Diagnostic submit error', err)
      setSubmitError('Une erreur est survenue. Veuillez reessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <SEOHead title="Diagnostic Habitat Gratuit | BRH" description="Realisez un diagnostic gratuit de votre habitat en quelques minutes. Identifiez les travaux prioritaires et les aides disponibles." />
      <div className="max-w-[1200px] mx-auto p-8 flex gap-8 items-start">

        {/* Colonne gauche : Stepper + Carte centrale */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">

          <HorizontalStepper step={step} stepLabels={STEP_LABELS} />

          <div className="max-w-[700px] w-full mx-auto bg-white rounded-xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
            {step === 1 && <StepTypes />}
            {step === 2 && <StepProperty showYearError={showYearError} />}
            {step === 3 && <StepSituation />}
            {step === 4 && <StepEquipment />}
            {step === 5 && <StepSymptoms />}

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
              totalSteps={TOTAL_STEPS}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>

        {/* Panneau lateral */}
        <div className="hidden lg:block">
          <SidePanel step={step} />
        </div>
      </div>
    </div>
  )
}
