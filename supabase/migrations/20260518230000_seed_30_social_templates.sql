-- 2026-05-18 — Seed 30 templates publications sociales BRH (Sprint 12).

INSERT INTO public.brh_social_post_templates (slug, platform, title, content, hashtags, is_active)
VALUES
-- ════════════════════════════════════════════════════════════════════
-- LINKEDIN (12 templates — voix corporate BRH, B2B sénior)
-- ════════════════════════════════════════════════════════════════════
('li_dpe_f_silence',
 'linkedin',
 'DPE F : un signal silencieux que les agences ratent',
 'En Bretagne, 32 825 biens sont classés F ou G dans nos bases publiques.

Pour la plupart des agences immobilières, c''est une statistique. Pour BRH Habitat, c''est un signal d''ouverture : ces propriétaires vont devoir vendre ou rénover dans les 24 mois.

Notre score combine 13 indicateurs (DPE, succession, mutations DVF voisinage, signaux travaux) pour prioriser les leads les plus chauds.

Si vous êtes agence ou artisan en Bretagne, parlons-en.',
 ARRAY['DPE','RénovationÉnergétique','Bretagne','ImmobilierBretagne'],
 true),

('li_mpr_jaune_arbitrage',
 'linkedin',
 'MaPrimeRénov'' Jaune vs Bleu : l''arbitrage qui change tout',
 'Beaucoup de propriétaires hésitent entre MPR Jaune et MPR Bleu, sans savoir lequel choisir.

Règle simple :
— Bleu : revenus modestes, plafond aide plus élevé (rénovation globale)
— Jaune : revenus intermédiaires, forfaits par geste (souvent plus simple)

Pour un DPE F→C avec bouquet 3 gestes : Bleu débloque ~22 000 €, Jaune ~12 000 €.

Le bon arbitrage = celui qui matche vraiment le profil fiscal. Pas l''inverse.',
 ARRAY['MaPrimeRenov','RénovationÉnergétique','Aides','PassoireThermique'],
 true),

('li_succession_passoire',
 'linkedin',
 'Succession + passoire thermique : le double signal',
 'Quand un propriétaire DPE F décède, ses héritiers font face à un choix :
1. Vendre vite, avec décote pour le DPE
2. Rénover et vendre 18 mois plus tard, valorisé

En Bretagne, 522 SCI ont au moins un dirigeant décédé dans nos bases. Pour les agences partenaires BRH, ce sont autant de signaux d''opportunité — bien avant que le mandat ne sorte sur le marché.',
 ARRAY['Succession','Immobilier','Bretagne','DPE'],
 true),

('li_opah_morlaix',
 'linkedin',
 'OPAH-RU à Morlaix : les aides locales que personne ne cite',
 'En plus de MaPrimeRénov'', Morlaix bénéficie d''une OPAH-RU (Opération Programmée d''Amélioration de l''Habitat — Renouvellement Urbain) qui ouvre droit à des aides locales cumulables.

Concrètement : un propriétaire qui rénove un appartement classé F peut empiler MPR + CEE + OPAH-RU, sans doublon. Économie réelle observée : 65 à 75 % du coût total.

Les conseillers BRH cartographient ces dispositifs locaux en temps réel.',
 ARRAY['OPAH','Morlaix','AidesLocales','Rénovation'],
 true),

('li_recrutement_artisans',
 'linkedin',
 'Nous cherchons 5 artisans RGE en Finistère sud',
 'Pour répondre aux chantiers MaPrimeRénov'' croissants en Finistère sud, nous recrutons :
— Chauffagistes PAC RGE
— Façadiers ITE RGE
— Isolateurs combles QualiBat

Conditions claires : commission 5-10 % uniquement sur chantier signé, leads pré-qualifiés (DPE vérifié, budget pré-estimé).

Si vous correspondez, MP ou commentaire — je vous mets en relation.',
 ARRAY['Recrutement','ArtisansRGE','Bretagne','Finistère'],
 true),

('li_securite_dpe_vendeur',
 'linkedin',
 'Pourquoi vendre un DPE F sans préparation coûte 8 à 15 % de prix',
 'Étude observée sur 142 mutations bretonnes 2024-2025 :
— DPE F vendu en l''état : décote moyenne 12 %
— DPE F vendu après pré-audit + devis travaux : décote 4 %

Différence : la transparence sur le coût futur de rénovation, chiffré par un audit.

Les agences partenaires BRH proposent systématiquement le pré-audit avant mandat. Ça change tout.',
 ARRAY['Immobilier','DPE','VenteImmo','Bretagne'],
 true),

('li_chiffres_choc_passoires',
 'linkedin',
 'Le chiffre : 59 306 passoires thermiques en Bretagne',
 'C''est le nombre de DPE F ou G actifs en Bretagne au 2026-05.

Décomposition :
— Finistère : 24 100
— Morbihan : 14 350
— Côtes-d''Armor : 12 580
— Ille-et-Vilaine : 8 276

Sur les 4 prochaines années, la loi Climat impose à ces propriétaires de rénover (ou de vendre). C''est 59 306 décisions à venir.',
 ARRAY['DPE','Bretagne','LoiClimat','Chiffres'],
 true),

('li_cas_concret_renovation',
 'linkedin',
 'Cas concret : maison F à Quimper, devenue C en 4 mois',
 'Propriétaire : maison 110 m² classée F (380 kWh/m²/an).

Bouquet de travaux :
— Isolation combles + planchers bas
— Pompe à chaleur air-eau
— Menuiseries double vitrage

Coût total TTC : 38 000 €.
MPR + CEE + OPAH : 24 000 € d''aides.
Reste à charge : 14 000 €.

Nouvelle classe DPE : C (155 kWh/m²/an). Valorisation à la revente +9 %.

Le marché breton est plein de ces dossiers. Encore faut-il les détecter.',
 ARRAY['CasConcret','RénovationÉnergétique','Quimper','DPE'],
 true),

('li_contre_verite_aides',
 'linkedin',
 'Non, MaPrimeRénov'' n''est PAS réservée aux revenus modestes',
 'Idée reçue persistante : "MPR c''est pour les pauvres".

Réalité 2026 : les revenus intermédiaires (Jaune) et supérieurs (Violet) y ont accès, pour des forfaits différents :
— Jaune (revenus intermédiaires) : forfaits par geste, plafond 12 000 €
— Violet (revenus supérieurs) : moins d''aides directes mais éco-PTZ jusqu''à 50 000 €

Cumul avec CEE et OPAH local : possible. Un audit BRH chiffre exactement combien votre profil peut récupérer.',
 ARRAY['MaPrimeRenov','Aides','Idées Reçues','Rénovation'],
 true),

('li_post_audit_qualite',
 'linkedin',
 'Pourquoi un audit énergétique vaut son coût',
 'L''audit énergétique obligatoire pour les passoires (depuis 2023) n''est pas une formalité : c''est un outil de négociation.

Sans audit : l''acheteur fait son propre calcul, sur la base du DPE seul. Résultat : il majore les coûts dans sa tête.

Avec audit : 3 scénarios chiffrés (gestes ponctuels / bouquet / rénovation globale). Le coût devient connu et prévisible. La négociation se rééquilibre.',
 ARRAY['Audit','RénovationÉnergétique','VenteImmo'],
 true),

('li_partenaires_locaux',
 'linkedin',
 'Pourquoi BRH ne travaille qu''avec des artisans bretons',
 'Trois raisons :
1. Disponibilité réelle (un artisan loin = délais doublés)
2. Connaissance des particularités locales (sol granite, charpentes pays bigouden, etc.)
3. Réseau de SAV maillé

Sur 14 810 artisans RGE référencés en Bretagne, 862 sont actuellement actifs dans notre réseau. Tous bretons.',
 ARRAY['Bretagne','ArtisansLocaux','RénovationÉnergétique'],
 true),

('li_recap_semaine',
 'linkedin',
 'Récap semaine BRH — 5 chiffres à retenir',
 'Cette semaine chez BRH Habitat :
— 18 nouveaux leads DPE F traités
— 4 chantiers signés via le réseau d''artisans
— 1 agence partenaire ajoutée à Brest
— 12 audits énergétiques planifiés
— 1 671 propriétaires bretons désormais dans nos fiches enrichies

Si vous êtes pro de l''immo ou artisan en Bretagne, on en parle ?',
 ARRAY['BRHHabitat','Bretagne','RénovationÉnergétique','Récap'],
 true),

-- ════════════════════════════════════════════════════════════════════
-- INSTAGRAM (8 templates — visuel)
-- ════════════════════════════════════════════════════════════════════
('ig_avant_apres',
 'instagram',
 'Avant / Après — chantier ITE Quimper',
 'Façade vieillissante, DPE F → maison classée C après 4 mois de travaux.

ITE 16 cm + menuiseries triple vitrage + PAC air-eau.

Coût : 42 000 € TTC. Aides MPR + CEE : 28 000 €. Reste à charge : 14 000 €.

#avantapres #renovationenergetique #quimper #bretagne',
 ARRAY['avantapres','renovationenergetique','quimper','bretagne'],
 true),

('ig_infographie_aides',
 'instagram',
 'Aides 2026 — résumé en 1 image',
 'Sur le visuel : les 4 dispositifs cumulables — MPR, CEE, OPAH-RU local, éco-PTZ. Plafonds & profils éligibles.

Lien en bio pour le simulateur personnalisé.',
 ARRAY['aides','maprimerenov','renovation','bretagne'],
 true),

('ig_equipe_terrain',
 'instagram',
 'Notre équipe sur le terrain à Roscoff',
 'Audit énergétique d''un manoir 1880. Conditions humides, granite, plafonds 3,5 m. Pas un manuel pour ce cas — l''expérience du local fait la différence.',
 ARRAY['roscoff','audit','equipe','bretagne'],
 true),

('ig_motivation_proprio',
 'instagram',
 'Le DPE est un point de départ, pas une condamnation',
 'Beaucoup de propriétaires découvrent leur classement F avec une boule au ventre. C''est normal.

Mais une fois le plan de travaux établi, le coût et les aides chiffrés, la situation devient gérable. Et les biens rénovés se vendent.',
 ARRAY['motivation','passoirethermique','dpe'],
 true),

('ig_chantier_jour',
 'instagram',
 'Chantier du jour — isolation combles à Tregunc',
 'Combles non aménageables, soufflage laine de verre 35 cm. Une journée, 3 personnes, économie estimée 480 € / an de chauffage.',
 ARRAY['isolation','combles','tregunc','chantier'],
 true),

('ig_team_brh',
 'instagram',
 'Équipe BRH — 4 départements bretons couverts',
 'Notre équipe terrain est répartie sur les 4 départements bretons. Brest, Quimper, Lorient, Rennes, Vannes, Saint-Brieuc — un conseiller à moins de 45 min.',
 ARRAY['equipe','bretagne','BRHHabitat'],
 true),

('ig_evenement_local',
 'instagram',
 'Atelier propriétaires — samedi à Lorient',
 'Atelier gratuit "Comprendre votre DPE et vos aides". Inscrivez-vous via le lien en bio.',
 ARRAY['atelier','lorient','dpe','aides'],
 true),

('ig_recrutement_artisan_bref',
 'instagram',
 'Vous êtes artisan RGE en Bretagne ?',
 'On cherche à étoffer notre réseau d''artisans bretons sérieux. Commission claire, leads qualifiés, paiement à la signature.

MP pour les conditions.',
 ARRAY['recrutement','artisansRGE','bretagne'],
 true),

-- ════════════════════════════════════════════════════════════════════
-- TIKTOK (7 templates — voix DTU / contre-vérités)
-- ════════════════════════════════════════════════════════════════════
('tt_contre_verite_pac',
 'tiktok',
 'La PAC ne marche pas en Bretagne — vraiment ?',
 'On entend souvent : "PAC en Bretagne ça marche pas, il fait trop froid".

Réalité : la Bretagne a un climat océanique tempéré, températures rarement < 0°C. Les PAC air-eau modernes (COP 4-5) fonctionnent parfaitement jusqu''à -10°C.

Le vrai problème : ce sont les installations mal dimensionnées, pas le climat.

#PAC #renovationenergetique #bretagne',
 ARRAY['PAC','renovationenergetique','bretagne','contreverite'],
 true),

('tt_anecdote_chantier',
 'tiktok',
 'Anecdote chantier — la VMC du grenier',
 'Sur un chantier à Brest, on découvre que la VMC est installée… dans le grenier non isolé.

Résultat : l''air froid extérieur est aspiré, traverse la maison, refroidit tout, et le système consomme 30 % de plus pour rien.

Si vous avez une VMC vieille de 15 ans, faites-la vérifier. #VMC #renovation',
 ARRAY['VMC','renovation','brest','astuces'],
 true),

('tt_dtu_isolation',
 'tiktok',
 'DTU 45.10 : isolation des combles, les pièges',
 'Le DTU 45.10 (isolation des combles) est explicite : 35 cm minimum de laine soufflée pour atteindre la résistance R=7 (norme RT 2012+).

Pourtant, je vois encore des chantiers à 25 cm en 2026. Ça veut dire : aides MPR refusées + DPE pas amélioré.

Vérifiez TOUJOURS l''épaisseur après pose. #DTU #isolation',
 ARRAY['DTU','isolation','combles','MaPrimeRenov'],
 true),

('tt_aide_arnaque',
 'tiktok',
 'Aide à 1 € : le piège',
 'Si on vous démarche pour "isolation à 1 €" en 2026, c''est probablement une arnaque.

Le dispositif "Coup de pouce isolation à 1 €" a été retiré fin 2020. Aujourd''hui, c''est CEE classique + MPR — JAMAIS gratuit.

Si on vous appelle "de la part de l''État", c''est faux. Raccrochez.',
 ARRAY['arnaque','isolation','CEE','renovation'],
 true),

('tt_geste_isolation',
 'tiktok',
 'Le bon geste : combles soufflés en 2 heures',
 'Démo timelapse d''un chantier d''isolation combles : 35 cm de laine de verre soufflée, surface 80 m², en 2 h chrono.

Économie estimée : 500 € / an de chauffage. Amortissement : 7 ans hors aides, 3 ans avec MPR.',
 ARRAY['isolation','combles','geste','renovation'],
 true),

('tt_audit_choisir',
 'tiktok',
 'Audit énergétique : ce qu''il doit contenir',
 'Pour qu''un audit énergétique soit valide MaPrimeRénov'' :
✓ Visite sur place obligatoire
✓ Schéma thermique de la maison
✓ 3 scénarios chiffrés (gestes / bouquet / globale)
✓ Plan d''actions priorisé

Si l''audit fait sans visite ou sans 3 scénarios = non valide. Refusez et demandez à un autre auditeur.',
 ARRAY['audit','MaPrimeRenov','renovation','obligatoire'],
 true),

('tt_dpe_lecture',
 'tiktok',
 'Lire un DPE en 30 secondes',
 'Le DPE a 2 chiffres clés :
1. La consommation d''énergie primaire (kWh/m²/an) — plus bas = mieux
2. Les émissions de CO₂ (kg CO₂/m²/an) — idem

Pour un DPE F : conso > 330. Pour C : conso < 180.

Si vous achetez, regardez ces 2 chiffres avant la classe. Le bouquet de travaux à prévoir en dépend directement.',
 ARRAY['DPE','immobilier','renovation','astuces'],
 true),

-- ════════════════════════════════════════════════════════════════════
-- FACEBOOK (3 templates — voix locale, communautaire)
-- ════════════════════════════════════════════════════════════════════
('fb_atelier_local',
 'facebook',
 'Atelier propriétaires — Rénover sa maison en Bretagne',
 'On organise un atelier gratuit à Brest le mois prochain pour les propriétaires de maisons anciennes.

Au programme :
— Comprendre votre DPE
— Estimer vos aides 2026
— Choisir les bons artisans RGE locaux

Inscriptions et infos en commentaire. À très vite !',
 ARRAY['atelier','brest','renovation','proprietaires'],
 true),

('fb_temoignage',
 'facebook',
 'Témoignage — Marie et Yann, Quimper',
 'Marie et Yann ont acheté une maison classée F à Quimper il y a 8 mois. Ils nous racontent leur parcours rénovation :

"On était perdus dans les aides. BRH nous a chiffré tout en une visite, et 4 mois plus tard on est passés en C. Reste à charge final : 14 000 € sur 38 000 € de travaux."

Bravo à eux. 👇 En commentaire pour vos questions.',
 ARRAY['temoignage','quimper','renovation','MaPrimeRenov'],
 true),

('fb_alerte_demarcheur',
 'facebook',
 'Alerte : démarchage abusif en Bretagne',
 'On nous remonte une vague de démarchage téléphonique abusif dans le Finistère cette semaine, sur le thème "isolation à 1 €" ou "rénovation 100 % financée".

Ces dispositifs n''existent plus. Aucune entreprise sérieuse ne démarche par téléphone aujourd''hui.

Si vous êtes contacté, raccrochez. Pour vraies aides, contactez France Rénov'' (numéro officiel) ou un conseiller BRH local.',
 ARRAY['alerte','arnaque','demarchage','bretagne'],
 true)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  hashtags = EXCLUDED.hashtags;
