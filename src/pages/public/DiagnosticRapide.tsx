/**
 * DiagnosticRapide — Mode rapide 5 min adapté aux problèmes cochés.
 *
 * Retour Philippe 12/05/2026 : le diag rapide précédent (DiagnosticExpressPage,
 * BDNB CSTB) sortait toujours les mêmes infos isolation + MaPrimeRénov',
 * peu importe le problème déclaré. Refonte : on personnalise les travaux et
 * aides selon les problèmes cochés en amont, sans jargon technique.
 *
 * Lit `?p=humidite,froid,...` (query string) propagés depuis SimulateurProbleme.
 * Si pas de query (entrée directe depuis le hub) : on demande à choisir 1 pb
 * minimum avant d'afficher les recommandations.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Snowflake,
  Sun,
  Euro,
  Droplets,
  AlertTriangle,
  Home as HomeIcon,
  CheckCircle2,
  ArrowRight,
  Building2,
  Coins,
  Wind,
  Layers,
  Wrench,
  MapPin,
  Microscope,
} from 'lucide-react'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'

type ProblemId = 'froid' | 'chaud' | 'factures' | 'humidite' | 'loi_climat' | 'vente'

const PROBLEM_META: Record<ProblemId, { label: string; Icon: typeof Snowflake; tint: string }> = {
  froid: { label: "Trop froid l'hiver", Icon: Snowflake, tint: 'bg-sky-100 text-sky-700' },
  chaud: { label: "Trop chaud l'été", Icon: Sun, tint: 'bg-amber-100 text-amber-700' },
  factures: { label: "Factures d'énergie élevées", Icon: Euro, tint: 'bg-emerald-100 text-emerald-700' },
  humidite: { label: 'Humidité ou moisissure', Icon: Droplets, tint: 'bg-cyan-100 text-cyan-700' },
  loi_climat: { label: 'DPE F ou G (Loi Climat)', Icon: AlertTriangle, tint: 'bg-red-100 text-red-700' },
  vente: { label: 'Préparer la vente / location', Icon: HomeIcon, tint: 'bg-slate-100 text-slate-700' },
}

interface RecoTravaux {
  titre: string
  description: string
  Icon: typeof Wrench
  priorite: 'haute' | 'moyenne' | 'soutien'
}

interface RecoAide {
  nom: string
  description: string
  montant?: string
}

const RECOS_TRAVAUX: Record<ProblemId, RecoTravaux[]> = {
  froid: [
    { titre: 'Isolation des murs', description: 'Diviser les pertes de chaleur par 3. Mode extérieur (ITE) si vous ne refaites pas l\'intérieur, sinon intérieur (ITI).', Icon: Layers, priorite: 'haute' },
    { titre: 'Isolation toiture / combles', description: 'Le toit représente 25-30% des pertes. Soufflage de ouate ou laine, intervention rapide.', Icon: Layers, priorite: 'haute' },
    { titre: 'Étanchéité fenêtres', description: 'Joints + double vitrage. Mauvaises fenêtres = 15% des pertes de chaleur.', Icon: Building2, priorite: 'moyenne' },
    { titre: 'Pompe à chaleur air/eau', description: 'Remplace une chaudière fioul ou gaz. Confort hiver supérieur + facture divisée par 2-3.', Icon: Wrench, priorite: 'moyenne' },
  ],
  chaud: [
    { titre: 'Isolation toiture (priorité été)', description: 'En été 80% de la chaleur entre par le toit. Isolation = pièces 5-8°C plus fraîches sans clim.', Icon: Layers, priorite: 'haute' },
    { titre: 'Protections solaires extérieures', description: 'Volets roulants pleins, brise-soleil, stores extérieurs. Plus efficaces que les rideaux intérieurs.', Icon: Sun, priorite: 'haute' },
    { titre: 'Ventilation nocturne (free cooling)', description: 'VMC hygro ou double flux + ouvertures nuit. Évacue la chaleur accumulée la journée.', Icon: Wind, priorite: 'moyenne' },
    { titre: 'Brasseur de plafond', description: 'Effet rafraîchissant sans clim. Bien plus économique qu\'un climatiseur.', Icon: Wind, priorite: 'soutien' },
  ],
  factures: [
    { titre: 'Audit énergétique complet', description: 'Identifie les déperditions précises de votre logement et chiffre le ROI de chaque geste.', Icon: Microscope, priorite: 'haute' },
    { titre: 'Isolation enveloppe (murs + toiture)', description: 'Le geste #1 pour faire baisser les factures durablement. Économies 30-50%.', Icon: Layers, priorite: 'haute' },
    { titre: 'Changement chauffage', description: 'Si chaudière > 15 ans : PAC ou bois divisent la facture par 2-3.', Icon: Wrench, priorite: 'moyenne' },
    { titre: 'VMC performante', description: 'Hygro B ou double flux. Récupère 70-90% de la chaleur sortante.', Icon: Wind, priorite: 'moyenne' },
  ],
  humidite: [
    { titre: 'Diagnostic ventilation', description: 'Vérification VMC existante, débits, prise d\'air, extraction. Cause #1 de moisissure.', Icon: Wind, priorite: 'haute' },
    { titre: 'Installation VMC hygro B', description: 'Ventilation qui s\'adapte à l\'humidité de chaque pièce. Élimine la moisissure sur 6-12 mois.', Icon: Wind, priorite: 'haute' },
    { titre: 'Traitement remontées capillaires', description: 'Pour les murs anciens en pierre / brique. Injection de résine ou barrière étanche.', Icon: Building2, priorite: 'moyenne' },
    { titre: 'Drainage périphérique', description: 'Si humidité ascensionnelle en sous-sol / RDC ancien. Évacue les eaux du terrain.', Icon: Wrench, priorite: 'moyenne' },
    { titre: 'Isolation intérieure prudente', description: 'À faire APRÈS la ventilation, jamais avant. Sinon vous emprisonnez l\'humidité dans les murs.', Icon: Layers, priorite: 'soutien' },
  ],
  loi_climat: [
    { titre: 'Audit énergétique réglementaire', description: 'Obligatoire pour vendre un F/G depuis 2023. Réalisé par un auditeur certifié.', Icon: Microscope, priorite: 'haute' },
    { titre: 'Bouquet de travaux Ampleur', description: 'Travaux groupés (isolation + chauffage + VMC) pour gagner ≥ 2 classes DPE. Subventions très majorées.', Icon: Wrench, priorite: 'haute' },
    { titre: 'Isolation enveloppe complète', description: 'Murs + toiture + plancher bas. Effet maximal sur le saut de classe DPE.', Icon: Layers, priorite: 'haute' },
    { titre: 'Remplacement chauffage si fossile', description: 'Sortir d\'une chaudière fioul ou gaz fait gagner 1-2 classes à elle seule.', Icon: Wrench, priorite: 'moyenne' },
  ],
  vente: [
    { titre: 'Étiquette DPE à jour', description: 'Indispensable pour vendre. Influence directement le prix (jusqu\'à -20% sur F/G).', Icon: Microscope, priorite: 'haute' },
    { titre: 'Travaux à haute valeur de revente', description: 'Isolation + chauffage moderne = +5 à +15% sur le prix de vente, ROI souvent positif.', Icon: Building2, priorite: 'haute' },
    { titre: 'Mise en règle ventilation', description: 'Une VMC qui marche = pas de moisissure visible aux visites. Détail qui rassure les acheteurs.', Icon: Wind, priorite: 'moyenne' },
    { titre: 'Audit pour aides aux acheteurs', description: 'Permet à votre acheteur de présenter un dossier MaPrimeRénov\' au moment de l\'offre.', Icon: Microscope, priorite: 'soutien' },
  ],
}

const AIDES_GENERALES: RecoAide[] = [
  { nom: 'MaPrimeRénov\'', description: 'Aide nationale aux ménages selon revenus. Travaux d\'isolation, chauffage, ventilation.', montant: 'Jusqu\'à 90% du coût HT pour les ménages très modestes' },
  { nom: 'Coup de pouce CEE', description: 'Primes des fournisseurs d\'énergie pour les travaux d\'économie d\'énergie. Cumulable avec MaPrimeRénov\'.', montant: 'Quelques centaines à plusieurs milliers d\'€' },
  { nom: 'Éco-prêt à taux zéro', description: 'Prêt sans intérêt jusqu\'à 50 000 € pour rénovation globale.', montant: 'Jusqu\'à 50 000 € sur 20 ans' },
  { nom: 'TVA réduite 5,5%', description: 'Sur les travaux d\'amélioration énergétique dans un logement de + 2 ans.', montant: 'TVA 5,5% au lieu de 20%' },
]

const AIDES_LOI_CLIMAT: RecoAide[] = [
  { nom: 'MaPrimeRénov\' Ampleur', description: 'Bouquet de travaux avec saut de classes DPE garanti. Subventions très majorées (jusqu\'à 70 000 € de travaux pris en charge).', montant: 'Jusqu\'à 63 000 € d\'aides pour un ménage modeste' },
]

const AIDES_BRETAGNE: RecoAide[] = [
  { nom: 'Aides locales Bretagne', description: 'La Région Bretagne et certains EPCI (Brest Métropole, Rennes Métropole, etc.) proposent des aides complémentaires.', montant: 'Quelques centaines à plusieurs milliers d\'€ selon collectivité' },
]

function isBretagne(postalCode: string): boolean {
  return /^(22|29|35|56)/.test(postalCode)
}

export default function DiagnosticRapide() {
  const [searchParams] = useSearchParams()
  const rawP = searchParams.get('p') ?? ''
  const problemes = useMemo<ProblemId[]>(() => {
    const allowed: ProblemId[] = ['froid', 'chaud', 'factures', 'humidite', 'loi_climat', 'vente']
    return rawP.split(',').map((s) => s.trim()).filter((s): s is ProblemId => allowed.includes(s as ProblemId))
  }, [rawP])

  const [address, setAddress] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<{ city: string; postalCode: string; citycode: string } | null>(null)
  const [showResult, setShowResult] = useState(false)

  // Si aucun problème en query, on affiche un mini-form pour en choisir au moins 1.
  const noProblemsYet = problemes.length === 0

  // Agrège tous les travaux de tous les problèmes sélectionnés (déduplique par titre).
  const travauxAgregges = useMemo<RecoTravaux[]>(() => {
    const seen = new Set<string>()
    const result: RecoTravaux[] = []
    for (const p of problemes) {
      for (const t of RECOS_TRAVAUX[p] ?? []) {
        if (seen.has(t.titre)) continue
        seen.add(t.titre)
        result.push(t)
      }
    }
    // Tri par priorité (haute > moyenne > soutien)
    const order = { haute: 0, moyenne: 1, soutien: 2 }
    return result.sort((a, b) => order[a.priorite] - order[b.priorite]).slice(0, 6)
  }, [problemes])

  const aidesAffichees = useMemo<RecoAide[]>(() => {
    const result: RecoAide[] = [...AIDES_GENERALES]
    if (problemes.includes('loi_climat')) result.unshift(...AIDES_LOI_CLIMAT)
    if (selectedLocation && isBretagne(selectedLocation.postalCode)) result.push(...AIDES_BRETAGNE)
    return result
  }, [problemes, selectedLocation])

  function handleAddressSelect(sel: { address: string; city: string; postalCode: string; citycode: string }) {
    setAddress(sel.address)
    setSelectedLocation({ city: sel.city, postalCode: sel.postalCode, citycode: sel.citycode })
  }

  function handleSubmit() {
    if (!selectedLocation) return
    setShowResult(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Link
          to="/diagnostic"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft size={14} /> Retour aux options
        </Link>

        <header className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-widest mb-3">
            Simulation rapide · 5 minutes
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            Votre première estimation
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            On vous propose les <strong className="text-slate-900">travaux les plus pertinents pour votre situation</strong> et les aides nationales correspondantes.
            Pour un calcul DPE précis et un chiffrage personnalisé, optez pour la <Link to="/simulateur/complet" className="text-slate-900 underline font-semibold">simulation complète</Link> (25-30 min).
          </p>
        </header>

        {/* Rappel des problèmes (s'ils viennent du flow probleme) */}
        {!noProblemsYet && (
          <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-2">Votre situation</p>
            <div className="flex flex-wrap gap-2">
              {problemes.map((p) => {
                const meta = PROBLEM_META[p]
                return (
                  <span key={p} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${meta.tint}`}>
                    <meta.Icon size={12} />
                    {meta.label}
                  </span>
                )
              })}
              <Link
                to="/simulateur/probleme"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                Modifier
              </Link>
            </div>
          </div>
        )}

        {/* Si pas de problème : on en demande un */}
        {noProblemsYet && !showResult && (
          <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-5">
            <p className="text-sm font-semibold text-amber-900 mb-2">
              Pour vous proposer les bons travaux, on a besoin de savoir ce qui vous préoccupe.
            </p>
            <Link
              to="/simulateur/probleme"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold transition"
            >
              Décrire ma situation <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Étape 1 : adresse */}
        {!noProblemsYet && !showResult && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 space-y-4 mb-6">
            <label className="block">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 mb-2">
                <MapPin size={14} className="text-slate-500" />
                Quelle est l'adresse de votre logement ?
              </span>
              <p className="text-xs text-slate-500 mb-3">Permet d'inclure les aides locales (Bretagne, communes…).</p>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onSelect={handleAddressSelect}
                placeholder="Ex : 5 rue de Siam, 29200 Brest"
              />
            </label>
            {selectedLocation && (
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition"
              >
                Voir mes recommandations <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Étape 2 : résultats */}
        {!noProblemsYet && showResult && (
          <div className="space-y-6">
            {/* Travaux recommandés */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6">
              <h2 className="font-display text-lg font-bold text-slate-900 mb-1 inline-flex items-center gap-2">
                <Wrench size={18} className="text-slate-700" />
                Travaux recommandés
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Classés du plus impactant au plus secondaire pour votre situation.
              </p>
              <div className="space-y-3">
                {travauxAgregges.map((t) => (
                  <article key={t.titre} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 transition">
                    <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${
                      t.priorite === 'haute' ? 'bg-emerald-100' : t.priorite === 'moyenne' ? 'bg-amber-100' : 'bg-slate-100'
                    }`}>
                      <t.Icon size={18} className={
                        t.priorite === 'haute' ? 'text-emerald-700' : t.priorite === 'moyenne' ? 'text-amber-700' : 'text-slate-600'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-bold text-slate-900">{t.titre}</p>
                        {t.priorite === 'haute' && (
                          <span className="text-[10px] uppercase font-bold bg-emerald-700 text-white px-1.5 py-0.5 rounded">
                            Priorité
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Aides */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6">
              <h2 className="font-display text-lg font-bold text-slate-900 mb-1 inline-flex items-center gap-2">
                <Coins size={18} className="text-emerald-700" />
                Aides financières applicables
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Les montants dépendent de vos revenus et du périmètre des travaux. Estimation précise dans la simulation complète.
              </p>
              <div className="space-y-2">
                {aidesAffichees.map((a) => (
                  <article key={a.nom} className="p-3 rounded-xl border border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{a.nom}</p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{a.description}</p>
                    {a.montant && (
                      <p className="text-xs font-semibold text-emerald-700 mt-1">→ {a.montant}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>

            {/* CTAs */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to={`/simulateur/complet${rawP ? `?p=${encodeURIComponent(rawP)}` : ''}`}
                className="group rounded-2xl border-2 border-slate-900 bg-slate-900 hover:bg-slate-800 text-white p-5 transition"
              >
                <Microscope size={20} className="mb-2 text-white" />
                <p className="font-bold text-base mb-1">Approfondir l'audit (25-30 min)</p>
                <p className="text-xs text-white/70 leading-relaxed">
                  Calcul DPE officiel + chiffrage personnalisé + montant exact des aides
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold group-hover:gap-1.5 transition-all">
                  Lancer l'audit complet <ArrowRight size={13} />
                </span>
              </Link>
              <Link
                to="/contact"
                className="group rounded-2xl border-2 border-slate-200 hover:border-slate-400 bg-white p-5 transition"
              >
                <CheckCircle2 size={20} className="mb-2 text-emerald-700" />
                <p className="font-bold text-base text-slate-900 mb-1">Discuter avec un pro RGE</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Devis gratuit + visite sur place. Un artisan partenaire BRH vous rappelle.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-slate-900 group-hover:gap-1.5 transition-all">
                  Prendre contact <ArrowRight size={13} />
                </span>
              </Link>
            </section>

            {/* Reset */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowResult(false)
                  setAddress('')
                  setSelectedLocation(null)
                }}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Recommencer avec une autre adresse
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
