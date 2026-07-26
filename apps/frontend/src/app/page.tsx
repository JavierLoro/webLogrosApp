import Link from "next/link"
import NuevoLogro from "./components/NuevoLogro"

// 📚 Tipamos la forma de un Logro para que TS valide el .map() de abajo.
type Logro = {
  id: number
  nombre: string
  puntos: number
}

// 📚 Este fetch corre en el SERVIDOR (esto es un Server Component async, ver Home). Por eso
//    usa process.env.BACKEND_URL (red interna de Docker) y NO una ruta relativa /api: aquí
//    "localhost" sí es la máquina del servidor. Es el caso opuesto a los Client Components.
async function getLogros(): Promise<Logro[]> {
  // 📚 cache: "no-store" → Next no cachea; pedimos la lista fresca en cada carga.
  const res = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:3001"}/logros`, { cache: "no-store" })
  return res.json()
}

// 📚 SERVER COMPONENT (sin "use client"). Un componente async que hace fetch en el servidor
//    y manda al navegador el HTML ya renderizado. No puede usar useState/localStorage.
export default async function Home() {
  const logros = await getLogros()

  return (
    <main className="max-w-2xl mx-auto p-8 flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Logros del equipo</h1>

      <NuevoLogro />

      <ul className="flex flex-col gap-4">
        {logros.map((logro) => (
          <li key={logro.id}>
            <Link
              href={`/logros/${logro.id}`}
              className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg">{logro.nombre}</span>
              <span className="font-bold text-blue-600">{logro.puntos} pts</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}