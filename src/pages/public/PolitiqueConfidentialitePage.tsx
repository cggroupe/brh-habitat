export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl text-text-primary mb-8">Politique de confidentialite</h1>
        <div className="bg-surface rounded-2xl border border-gray-light p-8 space-y-6 font-body text-sm text-text-secondary leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Collecte des donnees</h2>
            <p>
              BRH - Bretagne Renovation Habitat collecte des donnees personnelles dans le cadre
              de l'utilisation de ses services : formulaire de contact, diagnostic en ligne,
              creation de compte. Les donnees collectees incluent : nom, adresse email,
              numero de telephone, adresse du logement, et informations relatives au diagnostic.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Utilisation des donnees</h2>
            <p>
              Les donnees personnelles collectees sont utilisees pour :
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Repondre a vos demandes de contact et de devis</li>
              <li>Realiser le diagnostic de votre habitat</li>
              <li>Gerer votre espace client</li>
              <li>Vous informer sur nos services et actualites (avec votre consentement)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Protection des donnees</h2>
            <p>
              Conformement au Reglement General sur la Protection des Donnees (RGPD) et a la loi
              Informatique et Libertes, vous disposez d'un droit d'acces, de rectification,
              de suppression et d'opposition au traitement de vos donnees personnelles.
              Pour exercer ces droits, contactez-nous a : contact@contact-brh.fr
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Cookies</h2>
            <p>
              Ce site utilise des cookies techniques necessaires a son bon fonctionnement.
              Aucun cookie publicitaire ou de tracage n'est utilise sans votre consentement prealable.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Duree de conservation</h2>
            <p>
              Les donnees personnelles sont conservees pendant la duree necessaire a l'execution
              des services demandes, et au maximum pendant 3 ans a compter du dernier contact.
              Les donnees de compte sont conservees tant que le compte est actif.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Contact</h2>
            <p>
              Pour toute question relative a la protection de vos donnees personnelles :<br />
              BRH - Bretagne Renovation Habitat<br />
              35 rue de Kervao, 29490 Guipavas<br />
              Email : contact@contact-brh.fr<br />
              Telephone : 07 84 86 39 51
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
