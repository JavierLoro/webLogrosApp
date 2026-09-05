// 📚 COMPONENTE REUTILIZABLE para las pantallas aún no implementadas del esqueleto (Phase 6 a).
//    En vez de repetir el mismo JSX en las 13 páginas, se escribe UNA vez y cada página lo usa
//    con distintos textos. Mismo principio que un middleware compartido en el backend:
//    factorizar lo común. Cuando una pantalla se implemente de verdad, se borra su <Placeholder />.

// 📚 PROPS = los parámetros de un componente. Un componente React es una función que devuelve
//    JSX, y como toda función puede recibir datos. React SIEMPRE los entrega en un único objeto:
//    los atributos del JSX se convierten en sus claves.
//        <Placeholder titulo="Ranking" ... />   →   Placeholder({ titulo: "Ranking", ... })
//    Es la misma relación que hay entre el body de un POST y el req.body de Express.

// 📚 TYPE = un alias, un nombre para una forma. Esto es idéntico a escribir el objeto inline en
//    la firma (como en equipos.ts: `const { nombre, puntos }: { nombre: string; puntos: number }`),
//    pero con nombre se reutiliza y la firma cabe en pantalla.
//    OJO: un `type` NO existe en tiempo de ejecución — tsc lo borra al compilar. Por eso no se
//    puede hacer `new PlaceholderProps()` ni `instanceof`; para eso hace falta una CLASE (AppError).
//    Se usa `type` y no `interface` porque las props son cerradas: nadie debe ampliarlas desde
//    fuera. `interface` se elige cuando SÍ quieres que se fusione (ver types/express.d.ts, donde
//    se le añade `team` a la Request que ya define Express).
type PlaceholderProps = {
        titulo: string;
        fase: string;
        // 📚 Sin `?` = obligatoria. Decisión consciente: las 13 páginas la pasan y el componente
        //    es temporal, así que el coste de añadir el `?` más adelante es mínimo. Ajustar el
        //    rigor del tipo a la vida útil del código.
        descripcion: string;
    };

// 📚 Las props llegan DESESTRUCTURADAS en la firma ({ titulo, fase, descripcion }), igual que
//    `const { nombre, puntos } = req.body`. El `: PlaceholderProps` tipa el objeto ENTERO, no
//    cada campo por separado: TS deduce el tipo de cada pieza a partir de él.
// 📚 `export default` → las páginas lo importan sin llaves: `import Placeholder from "@/app/..."`.
//    (Contraste: resolveTeam es un export NOMBRADO porque su archivo podría exportar más cosas.)
export default function Placeholder({ titulo, fase, descripcion}: PlaceholderProps) {

    return (
<div>
        {/* 📚 Las llaves {} insertan el valor de una variable JS dentro del JSX. Aquí NO van
            textos literales: solo huecos. Los textos concretos ("Catálogo de logros"...) viven
            en cada página, que es quien USA este componente. Definición ≠ uso. */}
        <h2>{titulo}</h2>
        <p><strong>Fase:</strong> {fase}</p>
        <p><strong>Descripción:</strong> {descripcion}</p>
    </div>
    )
}
