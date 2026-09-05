"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../src/lib/prisma"));
const teams = [
    {
        slug: "halcones",
        nombre: "Halcones",
        logros: [
            { nombre: "Primer vuelo", puntos: 100, descripcion: "Completar el primer objetivo del equipo.", categoria: "Inicio", icono: "🪽" },
            { nombre: "Caza nocturna", puntos: 50, descripcion: "Resolver un reto fuera del horario habitual.", categoria: "Constancia", icono: "🌙" },
            { nombre: "Vuelo en picado", puntos: 200, descripcion: "Cerrar una tarea crítica antes del plazo.", categoria: "Impacto", icono: "⚡" },
            { nombre: "Trabajo en equipo", puntos: 80, descripcion: "Ayudar a otra persona a completar un objetivo.", categoria: "Equipo", icono: "🤝" },
            { nombre: "Mentoría", puntos: 120, descripcion: "Compartir conocimiento que desbloquee al equipo.", categoria: "Comunidad", icono: "🧭" },
            { nombre: "Racha impecable", puntos: 150, descripcion: "Completar cinco objetivos consecutivos.", categoria: "Constancia", icono: "🔥" },
        ],
    },
    {
        slug: "lobos",
        nombre: "Lobos",
        logros: [
            { nombre: "Aullido lunar", puntos: 75, descripcion: "Celebrar públicamente una victoria del equipo.", categoria: "Equipo", icono: "🐺" },
            { nombre: "Guardia nocturna", puntos: 60, descripcion: "Resolver una incidencia urgente fuera de horario.", categoria: "Constancia", icono: "🌘" },
            { nombre: "Manada unida", puntos: 110, descripcion: "Completar un objetivo con colaboración de todo el equipo.", categoria: "Equipo", icono: "🐾" },
            { nombre: "Rescate crítico", puntos: 180, descripcion: "Recuperar una situación que bloqueaba al equipo.", categoria: "Impacto", icono: "🛟" },
            { nombre: "Estratega", puntos: 140, descripcion: "Proponer un plan que simplifique el siguiente reto.", categoria: "Comunidad", icono: "🗺️" },
        ],
    },
];
const users = [
    { email: "test@halcones.com", teamSlug: "halcones" },
    { email: "ana@halcones.test", teamSlug: "halcones" },
    { email: "marcos@halcones.test", teamSlug: "halcones" },
    { email: "lucia@lobos.test", teamSlug: "lobos" },
];
const assignments = [
    { email: "test@halcones.com", teamSlug: "halcones", logro: "Primer vuelo" },
    { email: "test@halcones.com", teamSlug: "halcones", logro: "Trabajo en equipo" },
    { email: "ana@halcones.test", teamSlug: "halcones", logro: "Primer vuelo" },
    { email: "ana@halcones.test", teamSlug: "halcones", logro: "Mentoría" },
    { email: "marcos@halcones.test", teamSlug: "halcones", logro: "Caza nocturna" },
    { email: "lucia@lobos.test", teamSlug: "lobos", logro: "Aullido lunar" },
    { email: "lucia@lobos.test", teamSlug: "lobos", logro: "Manada unida" },
];
// 📚 Fail-fast: el seed necesita una contraseña elegida por quien lo ejecuta. Exigirla evita
//    guardar credenciales de prueba en Git o imprimirlas accidentalmente en los logs.
function requireSeedPassword() {
    const password = process.env.SEED_USER_PASSWORD;
    if (!password || password.length < 6) {
        console.error("SEED_USER_PASSWORD debe estar definida y tener al menos 6 caracteres.");
        process.exit(1);
    }
    return password;
}
async function main() {
    const passwordHash = await bcryptjs_1.default.hash(requireSeedPassword(), 10);
    // 📚 Una transacción hace que el seed sea atómico: o se escriben todos los datos relacionados
    //    o Prisma revierte el conjunto completo si aparece un error a mitad del proceso.
    await prisma_1.default.$transaction(async (tx) => {
        const teamIds = new Map();
        const logroIds = new Map();
        const userIds = new Map();
        for (const teamSeed of teams) {
            // 📚 upsert usa el slug único como identidad estable y permite repetir el seed sin
            //    duplicar tenants: actualiza si ya existe y crea solo la primera vez.
            const team = await tx.team.upsert({
                where: { slug: teamSeed.slug },
                update: { nombre: teamSeed.nombre },
                create: { slug: teamSeed.slug, nombre: teamSeed.nombre },
            });
            teamIds.set(teamSeed.slug, team.id);
            for (const logroSeed of teamSeed.logros) {
                const existing = await tx.logro.findFirst({
                    where: { teamId: team.id, nombre: logroSeed.nombre },
                });
                const logro = existing
                    ? await tx.logro.update({ where: { id: existing.id }, data: logroSeed })
                    : await tx.logro.create({ data: { ...logroSeed, teamId: team.id } });
                logroIds.set(`${teamSeed.slug}:${logroSeed.nombre}`, logro.id);
            }
        }
        for (const userSeed of users) {
            const teamId = teamIds.get(userSeed.teamSlug);
            if (!teamId)
                throw new Error(`Equipo de seed no encontrado: ${userSeed.teamSlug}`);
            // 📚 El upsert también restablece la contraseña de todas las cuentas de prueba al valor
            //    indicado en esta ejecución, sin revelar ese valor en la salida del comando.
            const user = await tx.user.upsert({
                where: { email: userSeed.email },
                update: { password: passwordHash, teamId },
                create: { email: userSeed.email, password: passwordHash, teamId },
            });
            userIds.set(userSeed.email, user.id);
        }
        for (const assignment of assignments) {
            const userId = userIds.get(assignment.email);
            const logroId = logroIds.get(`${assignment.teamSlug}:${assignment.logro}`);
            if (!userId || !logroId)
                throw new Error("Asignación de seed con referencias incompletas.");
            // 📚 La clave @@unique([userId, logroId]) permite un upsert idempotente: una persona no
            //    recibe dos veces el mismo logro aunque el seed se ejecute repetidamente.
            await tx.userLogro.upsert({
                where: { userId_logroId: { userId, logroId } },
                update: {},
                create: { userId, logroId },
            });
        }
    });
    console.info(`Seed completado: ${teams.length} equipos, ${teams.reduce((total, team) => total + team.logros.length, 0)} logros, ${users.length} usuarios y ${assignments.length} asignaciones.`);
}
main()
    .catch((error) => {
    console.error("No se pudo completar el seed.", error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma_1.default.$disconnect();
});
//# sourceMappingURL=seed.js.map