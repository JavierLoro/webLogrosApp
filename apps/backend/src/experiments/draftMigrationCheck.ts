import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { execFileSync } from "node:child_process"
import { Pool } from "pg"

// 📚 Se prueba la migración contra registros anteriores reales, exclusivamente en la base aislada verificada antes de escribir.
async function main() {
  const url = new URL(process.env.DATABASE_URL!)
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55437"); assert.equal(url.pathname, "/weblogros_ui")
  const db = new Pool({ connectionString: url.href })
  const run = randomUUID()
  let userId: number | undefined, teamId: number | undefined
  try {
    assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name, "weblogros_ui")
    const has = (await db.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'AchievementDraft'`)).rowCount
    if (has) { console.log("Migración ya aplicada; ensayo pre-migración no repetido"); return }
    const catalog = (await db.query('SELECT * FROM "Logro" ORDER BY id')).rows
    const proposals = (await db.query('SELECT * FROM "PropuestaLogro" ORDER BY id')).rows
    userId = (await db.query('INSERT INTO "User" (email,password) VALUES ($1,$2) RETURNING id', [`draft-migration-${run}@example.invalid`, "no-login"])).rows[0].id
    teamId = (await db.query('INSERT INTO "Team" (slug,nombre) VALUES ($1,$2) RETURNING id', [`draft-migration-${run}`, "Migration probe"])).rows[0].id
    for (const status of ["PENDING", "ACCEPTED", "REJECTED"]) await db.query('INSERT INTO "PropuestaLogro" ("teamId","userId",nombre,descripcion,criterios,status) VALUES ($1,$2,$3,$4,$5,$6)', [teamId, userId, "Original", "Preserve", ["Original criterion"], status])
    const output = execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { encoding: "utf8", env: process.env })
    console.log(output)
    const rows = (await db.query('SELECT * FROM "PropuestaLogro" WHERE "teamId"=$1 ORDER BY id', [teamId])).rows
    assert.deepEqual(rows.map(r => [r.status, r.imageRepairAllowed, r.imageAssetId, r.nombre, r.criterios]), ["PENDING", "ACCEPTED", "REJECTED"].map(status => [status, status === "PENDING", null, "Original", ["Original criterion"]]))
    assert.deepEqual((await db.query('SELECT * FROM "Logro" ORDER BY id')).rows, catalog)
    const after = (await db.query('SELECT * FROM "PropuestaLogro" WHERE "teamId" <> $1 ORDER BY id', [teamId])).rows
    assert.deepEqual(after.map(({ imageAssetId, imageRepairAllowed, ...row }) => row), proposals)
    assert.ok(after.every(r => r.imageRepairAllowed === (r.status === "PENDING") && r.imageAssetId === null))
    console.log("PASS: migración aditiva, legacy pendiente subsanable, resueltas intactas, catálogo e historiales preservados")
  } finally {
    if (teamId) { await db.query('DELETE FROM "PropuestaLogro" WHERE "teamId"=$1', [teamId]); await db.query('DELETE FROM "Team" WHERE id=$1', [teamId]) }
    if (userId) await db.query('DELETE FROM "User" WHERE id=$1', [userId])
    await db.end()
  }
}
void main().catch(error => { console.error(error instanceof assert.AssertionError ? error : "Migration verification failed"); process.exitCode = 1 })
