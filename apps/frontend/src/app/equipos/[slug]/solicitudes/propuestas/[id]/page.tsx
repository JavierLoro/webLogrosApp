import Link from "next/link"

export default async function PropuestaDetallePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug } = await params

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      <Link className="font-mono text-xs uppercase tracking-widest text-coral" href={`/equipos/${slug}/solicitudes`}>
        ← Volver a mis solicitudes
      </Link>
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-coral">Mis propuestas</p>
        <h1 className="mt-3 font-display text-4xl font-bold">Detalle de mi propuesta</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Esta ruta queda preparada para mostrar el estado, la revisión y la incorporación al catálogo cuando se implemente el backend de propuestas.
        </p>
      </header>
    </div>
  )
}
