/**
 * Diagnostic express — saisie adresse → DPE actuel + projeté + aides + chiffrage.
 *
 * Phase 6 : absorption progressive du simulateur FastAPI port 8915.
 * V1 : appelle l'EF `dpe-express-lookup` qui proxie vers le simulateur.
 * V2+ : moteur 100% côté Supabase (table brh_dpe_prospects).
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Loader, ArrowRight, MapPin, Home, Zap, TrendingDown, Euro, MessageCircle, CheckCircle, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { DpeLabelGauge } from '@/components/audit/DpeLabelGauge'
import type { EtiquetteDpe } from '@/lib/dpe-engine/constants'
import { useAuth } from '@/hooks/useAuth'

interface DiagnosticGeste {
  geste: string
}

interface DiagnosticResult {
  found: boolean
  message?: string
  adresse?: string
  lat?: number
  lng?: number
  logement?: {
    type: string
    surface_m2: number
    annee_construction: number | null
    type_chauffage: string | null
  }
  dpe?: {
    actuel: string
    ges_actuel: string | null
    conso_ep_actuelle: number
    projete_s2: string | null
    projete_s2_cep: number | null
    projete_s2_gain_pct: number | null
  }
  travaux?: {
    total_ttc: number
    total_ht: number
    gestes?: DiagnosticGeste[]
  }
  aides?: {
    decile: string
    mpr: number
    cee: number
    mpr_par_decile: { bleu: number; jaune: number; violet: number; rose: number }
    reste_a_charge: number
  }
}

interface LeadFormState {
  firstName: string
  lastName: string
  phone: string
  email: string
  urgency: 'immediate' | '3mois' | '6mois' | 'plus'
}

const INITIAL_LEAD: LeadFormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  urgency: '3mois',
}

export default function DiagnosticExpressPage() {
  const { user } = useAuth()
  const [address, setAddress] = useState('')
  const [foyer, setFoyer] = useState(2)
  const [rfr, setRfr] = useState(30000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  // Lead form
  const [lead, setLead] = useState<LeadFormState>(INITIAL_LEAD)
  const [submittingLead, setSubmittingLead] = useState(false)
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)

  const handleLookup = async () => {
    if (!address || address.length < 5) {
      setError('Saisissez une adresse complète')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data, error: efError } = await supabase.functions.invoke<DiagnosticResult>(
        'dpe-express-lookup',
        { body: { q: address, foyer, rfr } },
      )
      if (efError) throw efError
      if (!data) throw new Error('Réponse vide')
      setResult(data)
      if (!data.found) {
        setError(data.message ?? "Adresse non couverte par la base de données.")
      }
    } catch (e) {
      console.error(e)
      setError("Erreur lors de la recherche. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const dpeProjete = useMemo(() => {
    if (!result?.dpe?.projete_s2) return null
    return result.dpe.projete_s2 as EtiquetteDpe
  }, [result])

  const handleSubmitLead = async () => {
    if (!result || !result.found) return
    setLeadError(null)
    if (!lead.firstName || !lead.lastName || !lead.phone) {
      setLeadError('Nom, prénom et téléphone obligatoires')
      return
    }
    setSubmittingLead(true)
    try {
      const workType = (result.travaux?.gestes ?? [])
        .map((g) => g.geste)
        .filter(Boolean)
      const { data, error: efErr } = await supabase.functions.invoke<{
        ok: boolean
        prospectId: string
      }>('dpe-express-create-lead', {
        body: {
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          email: lead.email || undefined,
          address: result.adresse,
          workType: workType.length > 0 ? workType : ['renovation_globale'],
          estimatedBudgetEuros: result.travaux?.total_ttc,
          urgency: lead.urgency,
          diagnosticContext: {
            etiquetteActuelle: result.dpe?.actuel,
            etiquetteProjetee: result.dpe?.projete_s2 ?? undefined,
            cepActuel: result.dpe?.conso_ep_actuelle,
            cepProjete: result.dpe?.projete_s2_cep ?? undefined,
            coutTravauxTtc: result.travaux?.total_ttc,
            aidesTotal: result.aides ? result.aides.mpr + result.aides.cee : undefined,
            resteACharge: result.aides?.reste_a_charge,
          },
        },
      })
      if (efErr) throw efErr
      if (!data?.ok) throw new Error('Réponse invalide')
      setLeadSubmitted(true)
    } catch (e) {
      console.error(e)
      setLeadError('Échec envoi. Veuillez réessayer.')
    } finally {
      setSubmittingLead(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto max-w-5xl p-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Diagnostic express</h1>
          <p className="mt-2 text-lg text-gray-600">
            Découvrez le potentiel énergétique de votre logement en moins de 30 secondes
          </p>
        </div>

        {/* Search box */}
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-900">
            Saisissez l'adresse de votre logement
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Données de la BDNB CSTB (millésime 2025-07.a) — couverture Bretagne
          </p>

          <div className="mt-4 space-y-3">
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="12 rue de la Paix, 29000 Quimper"
            />

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Personnes au foyer
                </span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={foyer}
                  onChange={(e) => setFoyer(Number(e.target.value))}
                  className="w-full rounded border-gray-300 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Revenu fiscal de référence (€)
                </span>
                <input
                  type="number"
                  step="1000"
                  value={rfr}
                  onChange={(e) => setRfr(Number(e.target.value))}
                  className="w-full rounded border-gray-300 text-sm"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleLookup}
              disabled={loading || !address}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-green-700 px-4 py-3 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Recherche en cours…' : 'Lancer le diagnostic'}
            </button>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
          </div>
        </div>

        {/* Results */}
        {result?.found && result.dpe && (
          <div className="mt-8 space-y-6">
            {/* Logement */}
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-green-700" />
                <div>
                  <h3 className="font-semibold">{result.adresse}</h3>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-600">
                    {result.logement?.type && (
                      <span className="inline-flex items-center gap-1">
                        <Home className="h-3 w-3" /> {result.logement.type}
                      </span>
                    )}
                    {result.logement?.surface_m2 && <span>{result.logement.surface_m2} m²</span>}
                    {result.logement?.annee_construction && (
                      <span>Construit en {result.logement.annee_construction}</span>
                    )}
                    {result.logement?.type_chauffage && (
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {result.logement.type_chauffage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* DPE actuel + projeté */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DpeLabelGauge
                etiquette={result.dpe.actuel as EtiquetteDpe}
                value={result.dpe.conso_ep_actuelle}
                unit="kWh EP/m²·an"
                title="Étiquette actuelle"
              />
              {dpeProjete && (
                <div className="rounded-lg border-2 border-green-700 bg-green-50 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-green-700">
                    Étiquette après rénovation
                  </h3>
                  <DpeLabelGauge
                    etiquette={dpeProjete}
                    value={result.dpe.projete_s2_cep ?? 0}
                    unit="kWh EP/m²·an"
                    title="Projection optimisée"
                  />
                  {result.dpe.projete_s2_gain_pct != null && (
                    <div className="mt-3 flex items-center gap-2 rounded bg-green-700 px-3 py-2 text-white">
                      <TrendingDown className="h-4 w-4" />
                      <span className="font-semibold">
                        Gain énergie : {Math.round(result.dpe.projete_s2_gain_pct * 100)} %
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Aides */}
            {result.aides && result.travaux && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-lg font-bold text-gray-900">
                  <Euro className="inline h-5 w-5 text-green-700" /> Vos aides estimées
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-md bg-gray-50 p-4">
                    <div className="text-xs uppercase text-gray-500">Coût total travaux</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">
                      {Math.round(result.travaux.total_ttc).toLocaleString('fr-FR')} €
                    </div>
                    <div className="text-xs text-gray-500">TTC tous gestes</div>
                  </div>
                  <div className="rounded-md bg-blue-50 p-4">
                    <div className="text-xs uppercase text-blue-700">MaPrimeRénov' + CEE</div>
                    <div className="mt-1 text-2xl font-bold text-blue-700">
                      {Math.round(result.aides.mpr + result.aides.cee).toLocaleString('fr-FR')} €
                    </div>
                    <div className="text-xs text-blue-600">
                      MPR : {Math.round(result.aides.mpr).toLocaleString('fr-FR')} € · CEE : {Math.round(result.aides.cee).toLocaleString('fr-FR')} €
                    </div>
                  </div>
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="text-xs uppercase text-green-700">Reste à charge</div>
                    <div className="mt-1 text-2xl font-bold text-green-700">
                      {Math.round(result.aides.reste_a_charge).toLocaleString('fr-FR')} €
                    </div>
                    <div className="text-xs text-green-600">
                      Selon votre profil ({result.aides.decile})
                    </div>
                  </div>
                </div>

                {/* Aides par décile */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Voir les aides selon votre niveau de revenus
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                    {(['bleu', 'jaune', 'violet', 'rose'] as const).map((d) => (
                      <div
                        key={d}
                        className={`rounded p-2 ${
                          d === result.aides!.decile
                            ? 'bg-green-100 border-2 border-green-700'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="capitalize text-gray-500">Décile {d}</div>
                        <div className="font-bold">
                          {Math.round(result.aides!.mpr_par_decile[d]).toLocaleString('fr-FR')} €
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Lead form / CTA */}
            <div className="rounded-lg bg-gradient-to-br from-green-700 to-green-800 p-6 text-white">
              {leadSubmitted ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <CheckCircle className="h-16 w-16 text-white" />
                  <h3 className="text-2xl font-bold">Demande envoyée !</h3>
                  <p className="text-sm opacity-90">
                    Un artisan RGE de BRH Habitat vous contactera dans les 48 h.
                  </p>
                  <Link
                    to="/diagnostic"
                    className="mt-2 inline-flex items-center gap-2 rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Faire un diagnostic complet
                  </Link>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold">Recevoir un devis personnalisé</h3>
                  <p className="mt-2 text-sm opacity-90">
                    Un artisan RGE de BRH Habitat vous contactera pour un audit complet et un devis détaillé adapté à votre situation.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Prénom *"
                      value={lead.firstName}
                      onChange={(e) => setLead({ ...lead, firstName: e.target.value })}
                      className="rounded-md border-0 px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Nom *"
                      value={lead.lastName}
                      onChange={(e) => setLead({ ...lead, lastName: e.target.value })}
                      className="rounded-md border-0 px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone * (06 12 34 56 78)"
                      value={lead.phone}
                      onChange={(e) => setLead({ ...lead, phone: e.target.value })}
                      className="rounded-md border-0 px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email (optionnel)"
                      value={lead.email}
                      onChange={(e) => setLead({ ...lead, email: e.target.value })}
                      className="rounded-md border-0 px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="text-xs uppercase tracking-wide opacity-80">
                      Quand souhaitez-vous lancer les travaux ?
                    </label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(['immediate', '3mois', '6mois', 'plus'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setLead({ ...lead, urgency: u })}
                          className={`rounded-full px-3 py-1 text-xs ${
                            lead.urgency === u
                              ? 'bg-white text-green-700 font-semibold'
                              : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                        >
                          {u === 'immediate'
                            ? 'Immédiat'
                            : u === '3mois'
                              ? 'Sous 3 mois'
                              : u === '6mois'
                                ? 'Sous 6 mois'
                                : 'Plus tard'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {leadError && (
                    <div className="mt-3 rounded-md bg-red-100 p-2 text-sm text-red-800">
                      {leadError}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSubmitLead}
                      disabled={submittingLead || !lead.firstName || !lead.lastName || !lead.phone}
                      className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-bold text-green-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {submittingLead ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                      Être rappelé gratuitement
                    </button>
                    {user ? (
                      <Link
                        to="/messages"
                        className="inline-flex items-center gap-2 rounded-md border border-white/40 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Contacter via mon espace
                      </Link>
                    ) : (
                      <Link
                        to="/inscription/particulier"
                        className="inline-flex items-center gap-2 rounded-md border border-white/40 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Créer un compte
                      </Link>
                    )}
                  </div>
                  <p className="mt-3 text-[11px] opacity-70">
                    En soumettant, vous acceptez d'être contacté par BRH Habitat. Vos données ne sont
                    pas revendues. Conformité RGPD.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mention */}
        <p className="mt-8 text-center text-xs text-gray-500">
          Estimations indicatives basées sur la BDNB CSTB. Pour un audit énergétique réglementaire,
          consultez un professionnel certifié RGE.
        </p>
      </div>
    </div>
  )
}
