type Logro = {
  id: number
  nombre: string
  puntos: number
}

// 📚 Server Component: fetch en el servidor → BACKEND_URL, no ruta relativa (ver page.tsx raíz).
async function getLogro(id: string): Promise<Logro | null> {
  const res = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:3001"}/logros/${id}`)
  // 📚 Si el backend responde 404, devolvemos null y la página muestra "no encontrado".
  if (!res.ok) return null
  return res.json()
}

// 📚 Ruta dinámica [id]: el segmento de la URL llega en params. En Next 16 params es una
//    Promise → hay que await. Esta es la página de detalle /logros/:id.
export default async function LogroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const logro = await getLogro(id)

  if (!logro) {
    return (
      <main className="max-w-2xl mx-auto p-8">
        <p className="text-red-500">Logro no encontrado.</p>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">{logro.nombre}</h1>
      <p className="text-xl text-blue-600 font-semibold">{logro.puntos} puntos</p>
    </main>
  )
}