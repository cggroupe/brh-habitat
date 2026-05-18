-- 2026-05-18 — Seed 30 templates emails BRH (Sprint 12 — retour Philippe).
--
-- 4 cibles : artisan / agence_immo / architecte / maitre_oeuvre.
-- Variables interpolables : {{nom}}, {{prenom}}, {{societe}}, {{ville}},
-- {{metier}}, {{expediteur_nom}}.

INSERT INTO public.brh_email_templates (slug, target_audience, subject, body_html, variables, is_active)
VALUES
-- ════════════════════════════════════════════════════════════════════
-- ARTISAN RGE (10 templates)
-- ════════════════════════════════════════════════════════════════════
('artisan_recrutement_marketplace',
 'artisan',
 'Rejoignez la marketplace BRH — chantiers qualifiés en Bretagne',
 '<p>Bonjour {{prenom}},</p>
<p>{{societe}} est référencée comme artisan RGE en Bretagne. BRH Habitat (Bretagne Rénovation Habitat) lance une marketplace dédiée aux artisans bretons pour vous mettre en relation avec des propriétaires ayant un DPE F ou G — donc éligibles MaPrimeRénov''.</p>
<p>Ce que nous proposons :</p>
<ul><li>Leads <strong>qualifiés en amont</strong> (DPE vérifié, budget pré-estimé)</li>
<li>Commission claire <strong>5 à 10 %</strong> uniquement sur chantier signé</li>
<li>Couverture des 4 départements bretons</li></ul>
<p>15 minutes en visio suffisent pour valider le périmètre. Échangerions-nous cette semaine ?</p>
<p>Cordialement,<br>{{expediteur_nom}}<br>BRH Habitat</p>',
 '["prenom","societe","expediteur_nom"]'::jsonb,
 true),

('artisan_relance_inscription',
 'artisan',
 'Suite à notre dernier échange — {{societe}}',
 '<p>Bonjour {{prenom}},</p>
<p>Suite à notre dernier échange, je voulais m''assurer que vous aviez bien reçu les informations sur le réseau d''artisans BRH.</p>
<p>Nous avons actuellement <strong>plus de 30 chantiers en attente</strong> dans votre zone, tous DPE F ou G. Si vous êtes intéressé, je vous propose un appel rapide cette semaine.</p>
<p>Au plaisir d''échanger,<br>{{expediteur_nom}}</p>',
 '["prenom","societe","expediteur_nom"]'::jsonb,
 true),

('artisan_dispatch_chantier',
 'artisan',
 'Nouveau chantier {{ville}} — DPE F, propriétaire motivé',
 '<p>Bonjour {{prenom}},</p>
<p>Nous avons un chantier qui correspond à vos spécialités, situé à {{ville}}.</p>
<p>Détails :</p>
<ul><li>DPE F, propriétaire occupant</li>
<li>Aides MPR Jaune / Bleu mobilisables</li>
<li>Demande de devis chauffage + isolation</li></ul>
<p>Si vous êtes dispo cette semaine, répondez à ce mail et nous vous mettons en relation directe.</p>
<p>{{expediteur_nom}} — BRH Habitat</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('artisan_retour_devis',
 'artisan',
 'Devis pour le chantier à {{ville}} — relance',
 '<p>Bonjour {{prenom}},</p>
<p>Nous avons reçu votre devis pour le chantier de {{ville}}, merci. Le propriétaire est en cours d''instruction des aides MaPrimeRénov''.</p>
<p>Pouvez-vous nous confirmer votre disponibilité de démarrage si l''accord financier est obtenu ?</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('artisan_suivi_installation',
 'artisan',
 'Suivi du chantier {{ville}} — étapes restantes',
 '<p>Bonjour {{prenom}},</p>
<p>Pour le chantier en cours à {{ville}}, pourriez-vous nous transmettre :</p>
<ul><li>Photos avant/après</li>
<li>Factures pour dossier MPR</li>
<li>Date de réception prévue</li></ul>
<p>Merci d''avance,<br>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('artisan_formation_aides',
 'artisan',
 'Formation gratuite — MaPrimeRénov'' 2026 (60 min visio)',
 '<p>Bonjour {{prenom}},</p>
<p>BRH organise une formation gratuite de 60 minutes en visio sur les nouvelles règles MaPrimeRénov'' 2026 (forfaits, calendrier, pièces, audits obligatoires).</p>
<p>Prochaine session : à venir. Réservez votre créneau en répondant à ce mail.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","expediteur_nom"]'::jsonb,
 true),

('artisan_recommandation_client',
 'artisan',
 'Nouveau client BRH pour vous — {{ville}}',
 '<p>Bonjour {{prenom}},</p>
<p>Un de nos clients à {{ville}} souhaite un devis pour des travaux qui rentrent dans votre spécialité. Il est déjà sensibilisé aux aides MPR, donc le terrain est préparé.</p>
<p>Souhaitez-vous que je vous transmette ses coordonnées ?</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('artisan_apres_vente',
 'artisan',
 'Retour du client sur le chantier — {{ville}}',
 '<p>Bonjour {{prenom}},</p>
<p>Le client de {{ville}} nous a fait un retour positif sur votre intervention. Merci pour votre sérieux.</p>
<p>Acceptez-vous que nous le mentionnions sur notre annuaire d''artisans recommandés ? Cela peut générer des contacts complémentaires.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('artisan_sondage_qualite',
 'artisan',
 'Comment évaluez-vous votre collaboration avec BRH ?',
 '<p>Bonjour {{prenom}},</p>
<p>Pour améliorer le service, nous aimerions votre retour franc sur la collaboration BRH-{{societe}} (3 minutes).</p>
<p>Répondez simplement à ce mail :</p>
<ol><li>Qualité des leads (1-10) ?</li>
<li>Rapidité du dispatch (1-10) ?</li>
<li>Suggestion d''amélioration ?</li></ol>
<p>Merci,<br>{{expediteur_nom}}</p>',
 '["prenom","societe","expediteur_nom"]'::jsonb,
 true),

('artisan_evenement_reseau',
 'artisan',
 'Soirée réseau artisans BRH — {{ville}}',
 '<p>Bonjour {{prenom}},</p>
<p>Nous organisons une soirée réseau pour les artisans BRH partenaires à {{ville}}. L''occasion d''échanger sur les tendances marché, les nouveaux dispositifs aides, et de rencontrer les autres pros du réseau.</p>
<p>Répondez à ce mail pour confirmer votre venue, je vous envoie les détails.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

-- ════════════════════════════════════════════════════════════════════
-- AGENCE IMMO (10 templates)
-- ════════════════════════════════════════════════════════════════════
('agence_recrutement_reseau',
 'agence_immo',
 'Rejoignez le réseau d''agences partenaires BRH — leads vendeurs DPE F/G',
 '<p>Bonjour {{prenom}},</p>
<p>{{societe}} est une agence active en Bretagne. BRH propose aux agences partenaires un flux mensuel de leads vendeurs qualifiés (DPE F ou G, biens à rénover), avec une plateforme de gestion intégrée.</p>
<p>Concrètement :</p>
<ul><li><strong>30 leads vendeurs/mois</strong> dès l''offre Standard (390 €/mois)</li>
<li>Plateforme avec score vente, score de motivation, succession détectée</li>
<li>Pas d''exclusivité, paiement seulement si transaction</li></ul>
<p>15 min de visio pour vous présenter la plateforme — quand seriez-vous dispo ?</p>
<p>{{expediteur_nom}} — BRH Habitat</p>',
 '["prenom","societe","expediteur_nom"]'::jsonb,
 true),

('agence_lead_chaud',
 'agence_immo',
 'Lead vendeur ultra-chaud {{ville}} — DPE F',
 '<p>Bonjour {{prenom}},</p>
<p>Nous venons d''identifier un propriétaire à {{ville}} :</p>
<ul><li>DPE F (passoire)</li>
<li>Score de motivation de vente : élevé</li>
<li>Pas encore mis en agence à notre connaissance</li></ul>
<p>Souhaitez-vous être mis en relation ? Premier arrivé, premier servi (les leads ultra-chauds partent vite).</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('agence_accompagnement_vendeur',
 'agence_immo',
 'Vendeur DPE F à {{ville}} — pack BRH pour boucler la vente',
 '<p>Bonjour {{prenom}},</p>
<p>Pour le bien que vous gérez à {{ville}}, BRH peut accompagner le vendeur avec :</p>
<ul><li>Estimation des aides MPR mobilisables par l''acheteur</li>
<li>Devis travaux de rénovation pré-budgétés</li>
<li>Argumentaire « rénovation post-acquisition » pour rassurer l''acheteur</li></ul>
<p>Cela peut accélérer le compromis. On en parle ?</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('agence_plateforme_score_vente',
 'agence_immo',
 'Score Vente BRH — testez gratuitement sur 1 bien',
 '<p>Bonjour {{prenom}},</p>
<p>Notre algorithme Score Vente prédit la probabilité de vente d''un bien dans les 12 mois à partir de 13 indicateurs (DPE, mutations DVF voisinage, succession, signaux travaux…).</p>
<p>Je vous propose d''en tester un sur un bien de votre portefeuille — gratuitement. Indiquez-moi simplement une adresse et je vous renvoie le rapport.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","expediteur_nom"]'::jsonb,
 true),

('agence_evenement_formation',
 'agence_immo',
 'Formation 1 h — Vendre un DPE F/G en Bretagne',
 '<p>Bonjour {{prenom}},</p>
<p>Visio gratuite 1 heure : <strong>« Comment vendre un bien classé F ou G sans casser le prix »</strong>. Cas concrets bretons, retours d''expérience d''agences partenaires.</p>
<p>Répondez à ce mail pour réserver un créneau (groupes de 10 max).</p>
<p>{{expediteur_nom}} — BRH Habitat</p>',
 '["prenom","expediteur_nom"]'::jsonb,
 true),

('agence_reporting_mensuel',
 'agence_immo',
 'Votre reporting mensuel BRH — {{societe}}',
 '<p>Bonjour {{prenom}},</p>
<p>Pour {{societe}}, ce mois-ci :</p>
<ul><li>Leads transmis : X</li>
<li>Leads claim&eacute;s : X</li>
<li>Conversions estim&eacute;es : X</li></ul>
<p>Reporting d&eacute;taill&eacute; sur votre tableau de bord. Une question ?</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","societe","expediteur_nom"]'::jsonb,
 true),

('agence_urgence_dossier',
 'agence_immo',
 'URGENT — Dossier client en cours à {{ville}}',
 '<p>Bonjour {{prenom}},</p>
<p>Le client commun pour le bien à {{ville}} a besoin d''une réponse rapide sur la disponibilité du dossier. Pouvez-vous m''appeler dès que possible ?</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('agence_alerte_succession',
 'agence_immo',
 'Alerte succession {{ville}} — bien à venir sur le marché',
 '<p>Bonjour {{prenom}},</p>
<p>Nous avons détecté à {{ville}} un cas de succession active sur un bien classé DPE F. Les héritiers vont probablement le mettre en vente dans les 6 mois.</p>
<p>Si vous voulez prendre contact en avance, répondez à ce mail.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('agence_partenariat_exclusif',
 'agence_immo',
 'Proposition d''exclusivité territoriale — {{ville}}',
 '<p>Bonjour {{prenom}},</p>
<p>Nous envisageons une exclusivité territoriale pour {{societe}} sur {{ville}} et les communes voisines. Cela vous garantirait l''accès en avant-première à tous nos leads sur ce périmètre.</p>
<p>Si cela vous intéresse, organisons un point cette semaine.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","societe","ville","expediteur_nom"]'::jsonb,
 true),

('agence_mrr_bilan',
 'agence_immo',
 'Bilan trimestriel {{societe}} — partenariat BRH',
 '<p>Bonjour {{prenom}},</p>
<p>Voici le bilan trimestriel de la collaboration {{societe}} × BRH Habitat. Si vous souhaitez optimiser le volume de leads ou changer de tier, je suis disponible pour un point.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","societe","expediteur_nom"]'::jsonb,
 true),

-- ════════════════════════════════════════════════════════════════════
-- ARCHITECTE (5 templates)
-- ════════════════════════════════════════════════════════════════════
('architecte_partenariat_moe',
 'architecte',
 'Partenariat MOE — projets rénovation énergétique BRH',
 '<p>Bonjour {{prenom}},</p>
<p>Votre cabinet d''architecture s''inscrit dans les acteurs locaux de la rénovation. BRH cherche à structurer une short-list de cabinets MOE partenaires pour les projets complexes (audits ADEME complets, immeubles tertiaires, copropriétés).</p>
<p>Échangerions-nous sur les modalités d''un partenariat non exclusif ?</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","expediteur_nom"]'::jsonb,
 true),

('architecte_projet_cles_en_main',
 'architecte',
 'Projet rénovation clé-en-main {{ville}} — votre expertise ?',
 '<p>Bonjour {{prenom}},</p>
<p>Nous avons un projet de rénovation complète à {{ville}} (maison ancienne, ~200 m²). Le client cherche un cabinet MOE pour la conception et le suivi.</p>
<p>Êtes-vous intéressé ? Je peux vous transmettre les détails.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('architecte_formation_mpr',
 'architecte',
 'MaPrimeRénov'' 2026 pour MOE — formation gratuite',
 '<p>Bonjour {{prenom}},</p>
<p>BRH organise une formation 90 min en visio sur les <strong>spécificités MaPrimeRénov'' pour les MOE</strong> : audits exigés, dossier technique, calendrier, déduction frais maîtrise d''œuvre.</p>
<p>Répondez pour réserver.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","expediteur_nom"]'::jsonb,
 true),

('architecte_evenement',
 'architecte',
 'Petit-déjeuner MOE × BRH × artisans bretons',
 '<p>Bonjour {{prenom}},</p>
<p>Petit-déjeuner d''échanges entre cabinets d''architecture et artisans RGE bretons, organisé par BRH. Format ouvert, contacts directs, marché breton.</p>
<p>Répondez si intéressé, je vous envoie le calendrier.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","expediteur_nom"]'::jsonb,
 true),

('architecte_recommandation',
 'architecte',
 'Un client à vous recommander — {{ville}}',
 '<p>Bonjour {{prenom}},</p>
<p>Un client BRH à {{ville}} cherche un architecte pour son projet de rénovation. Connaissant votre cabinet, j''ai pensé que cela pourrait coller.</p>
<p>Souhaitez-vous que je vous mette en relation ?</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

-- ════════════════════════════════════════════════════════════════════
-- MAITRE D''ŒUVRE / APPORTEUR (5 templates)
-- ════════════════════════════════════════════════════════════════════
('apporteur_partenariat',
 'maitre_oeuvre',
 'Devenez apporteur d''affaires BRH — Bretagne',
 '<p>Bonjour {{prenom}},</p>
<p>BRH Habitat lance un programme d''apporteurs d''affaires pour la rénovation énergétique en Bretagne. Commission claire sur chaque chantier signé via votre recommandation, paiement déclenché à la signature du devis.</p>
<p>15 min pour vous expliquer le mécanisme ?</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","expediteur_nom"]'::jsonb,
 true),

('apporteur_relance',
 'maitre_oeuvre',
 'Suite à notre échange — partenariat apporteur',
 '<p>Bonjour {{prenom}},</p>
<p>Suite à notre échange, je voulais m''assurer que vous aviez bien reçu le contrat d''apporteur d''affaires BRH. Avez-vous des questions sur les modalités de commission ou le périmètre ?</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","expediteur_nom"]'::jsonb,
 true),

('apporteur_evenement',
 'maitre_oeuvre',
 'Soirée annuelle apporteurs BRH — {{ville}}',
 '<p>Bonjour {{prenom}},</p>
<p>Soirée annuelle des apporteurs d''affaires BRH à {{ville}}. Bilan de l''année, nouveaux dispositifs aides, networking. Buffet offert.</p>
<p>Répondez pour confirmer votre venue.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","ville","expediteur_nom"]'::jsonb,
 true),

('apporteur_info_rgpd',
 'maitre_oeuvre',
 'Mise à jour conformité RGPD — apporteurs',
 '<p>Bonjour {{prenom}},</p>
<p>En tant qu''apporteur d''affaires BRH, vous transmettez des données prospects. Nous vous adressons les nouvelles règles RGPD applicables à partir de cette année (consentement explicite, durée de conservation, droits du prospect).</p>
<p>Document récapitulatif joint. Une question ? Répondez à ce mail.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","expediteur_nom"]'::jsonb,
 true),

('apporteur_mise_en_relation',
 'maitre_oeuvre',
 'Mise en relation — votre contact {{nom}}',
 '<p>Bonjour {{prenom}},</p>
<p>Merci pour la recommandation de {{nom}}. Nous avons pris contact et nous tenons à vous informer du suivi. Si signature, la commission sera versée selon le contrat signé.</p>
<p>{{expediteur_nom}}</p>',
 '["prenom","nom","expediteur_nom"]'::jsonb,
 true)

ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  variables = EXCLUDED.variables,
  updated_at = now();
