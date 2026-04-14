import { headingId } from './articleHelpers'

// Tracks whether the first paragraph has been rendered (for drop cap)
let isFirstParagraph = true

export function buildMarkdownComponents() {
  isFirstParagraph = true

  return {
    // H1 from markdown — hidden, shown in hero
    h1: () => null,

    // H2 — magazine-style with left accent bar
    h2: ({ children }: { children?: React.ReactNode }) => {
      const text = String(children ?? '')
      const id = headingId(text)
      return (
        <h2
          id={id}
          className="flex items-start gap-4 mt-14 mb-6 scroll-mt-24"
        >
          <span
            className="shrink-0 w-1 rounded-full bg-primary mt-1"
            style={{ minHeight: '2.5rem' }}
            aria-hidden="true"
          />
          <span className="font-display text-2xl sm:text-3xl text-primary-dark uppercase tracking-wide leading-tight">
            {children}
          </span>
        </h2>
      )
    },

    // H3
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="font-display text-xl text-slate-800 uppercase tracking-wide mt-10 mb-4 leading-tight">
        {children}
      </h3>
    ),

    // H4
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="font-display text-lg text-slate-700 uppercase tracking-wide mt-8 mb-3">
        {children}
      </h4>
    ),

    // Paragraph — first one gets drop cap
    p: ({ children }: { children?: React.ReactNode }) => {
      if (isFirstParagraph) {
        isFirstParagraph = false
        return (
          <p className="font-body text-slate-600 leading-[1.85] mb-6 text-lg [&::first-letter]:text-6xl [&::first-letter]:font-display [&::first-letter]:text-primary-dark [&::first-letter]:float-left [&::first-letter]:mr-3 [&::first-letter]:mt-1 [&::first-letter]:leading-none">
            {children}
          </p>
        )
      }
      return (
        <p className="font-body text-slate-600 leading-[1.85] mb-6">
          {children}
        </p>
      )
    },

    // Strong
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-slate-800">{children}</strong>
    ),

    // Em
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-slate-600">{children}</em>
    ),

    // Links
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        className="text-primary font-semibold underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),

    // Unordered list — with green bullet dots
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="my-6 space-y-3 font-body text-slate-600 leading-relaxed">
        {children}
      </ul>
    ),

    // Ordered list
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="my-6 space-y-3 font-body text-slate-600 leading-relaxed list-none counter-reset-[item]">
        {children}
      </ol>
    ),

    // List item
    li: ({ children, ordered }: { children?: React.ReactNode; ordered?: boolean }) => {
      if (ordered) {
        return (
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-display font-bold flex items-center justify-center mt-0.5">
              •
            </span>
            <span>{children}</span>
          </li>
        )
      }
      return (
        <li className="flex items-start gap-3">
          <span
            className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2.5"
            aria-hidden="true"
          />
          <span>{children}</span>
        </li>
      )
    },

    // Blockquote — magazine pull quote style
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="relative my-10 pl-8 pr-6 py-6 bg-primary/5 border-l-4 border-primary rounded-r-2xl">
        <span
          className="absolute top-3 left-4 font-accent text-6xl text-primary/20 leading-none select-none"
          aria-hidden="true"
        >
          "
        </span>
        <div className="font-body text-slate-700 text-lg leading-relaxed italic relative z-10">
          {children}
        </div>
      </blockquote>
    ),

    // HR — decorative separator
    hr: () => (
      <div className="flex items-center justify-center gap-4 my-14" aria-hidden="true">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
          <div className="w-1.5 h-1.5 bg-primary/70 rounded-full" />
          <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
        </div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
    ),

    // Images — full-bleed magazine style with caption
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <figure className="my-12 -mx-4 sm:-mx-8 lg:-mx-14">
        <div className="overflow-hidden rounded-2xl shadow-xl shadow-slate-900/10">
          <img
            src={src}
            alt={alt ?? ''}
            className="w-full object-cover max-h-[480px]"
            loading="lazy"
          />
        </div>
        {alt && (
          <figcaption className="text-center text-sm text-slate-400 mt-4 italic font-body px-4">
            {alt}
          </figcaption>
        )}
      </figure>
    ),

    // Tables
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="my-8 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full border-collapse font-body text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-primary/8">{children}</thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="px-5 py-3.5 text-left font-display text-xs uppercase tracking-widest text-primary-dark border-b border-slate-200">
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="px-5 py-3.5 text-slate-600 leading-relaxed">{children}</td>
    ),

    // Code inline
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      const isBlock = className?.includes('language-')
      if (isBlock) {
        return (
          <code className="block bg-slate-900 text-green-300 rounded-xl p-6 font-mono text-sm leading-relaxed overflow-x-auto my-6">
            {children}
          </code>
        )
      }
      return (
        <code className="bg-slate-100 text-primary-dark rounded px-1.5 py-0.5 font-mono text-sm">
          {children}
        </code>
      )
    },

    // Pre (code block wrapper)
    pre: ({ children }: { children?: React.ReactNode }) => (
      <pre className="my-6 rounded-xl overflow-hidden">{children}</pre>
    ),
  }
}
