export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl text-text-primary mb-8">Mentions legales</h1>
        <div className="bg-surface rounded-2xl border border-gray-light p-8 space-y-6 font-body text-sm text-text-secondary leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Editeur du site</h2>
            <p>
              BRH - Bretagne Renovation Habitat<br />
              35 rue de Kervao<br />
              29490 Guipavas<br />
              Telephone : 07 84 86 39 51<br />
              Email : contact@contact-brh.fr
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Hebergement</h2>
            <p>
              Ce site est heberge par Vercel Inc.<br />
              440 N Barranca Avenue #4133<br />
              Covina, CA 91723, USA
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Propriete intellectuelle</h2>
            <p>
              L'ensemble du contenu de ce site (textes, images, graphismes, logo, icones)
              est la propriete exclusive de BRH - Bretagne Renovation Habitat, a l'exception
              des marques, logos ou contenus appartenant a d'autres societes partenaires ou auteurs.
              Toute reproduction, distribution, modification, retransmission ou publication
              de ces elements est strictement interdite sans l'accord ecrit de BRH.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Limitation de responsabilite</h2>
            <p>
              Les informations contenues sur ce site sont aussi precises que possible et le site
              est regulierement mis a jour, mais peut toutefois contenir des inexactitudes, des omissions
              ou des lacunes. BRH ne pourra etre tenue responsable des dommages directs ou indirects
              resultant de l'utilisation de ce site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-text-primary mb-3">Credits</h2>
            <p>
              Site concu et developpe pour BRH - Bretagne Renovation Habitat.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
