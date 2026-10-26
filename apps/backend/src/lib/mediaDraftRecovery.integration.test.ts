import assert from "node:assert/strict"
import { fork, ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { once } from "node:events"
import { lstat, mkdtemp, realpath, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { test } from "node:test"
import { DATABASE_URL } from "../config/env"
import { objectStoreConfigFromEnv } from "../config/objectStoreEnv"
import prisma from "./prisma"
import { ObjectStore } from "./objectStore"
import { createMediaRuntime, MediaRuntime } from "./mediaRuntime"
import { createDraft, discardDraft } from "./achievementDrafts"
import { mediaAssetVariantSchema } from "./mediaPublication"

// 📚 Cada caso mata un proceso padre real. Reiniciar debe conservar el commit confirmado o retirar solo su staging, sin volver a ejecutar Sharp.
test("recuperación real de destinos borrador y subsanación", { skip: process.env.MEDIA_DRAFT_RECOVERY_TEST !== "1", timeout: 180_000 }, async t => {
  const url = new URL(DATABASE_URL); assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55437"); assert.equal(url.pathname, "/weblogros_ui")
  const config = objectStoreConfigFromEnv(); assert.equal(new URL(config.endpoint).hostname, "127.0.0.1"); assert.equal(new URL(config.endpoint).port, "8333"); assert.equal(config.bucket, "lockerboard-media-dev")
  const db = prisma, verifier = new ObjectStore(config)
  const counts = async () => ({ users: await db.user.count(), teams: await db.team.count(), members: await db.teamMembership.count(), drafts: await db.achievementDraft.count(), proposals: await db.propuestaLogro.count(), jobs: await db.mediaJob.count(), assets: await db.mediaAsset.count(), cleanup: await db.mediaAssetCleanup.count(), owners: await db.mediaRuntimeOwner.count() })
  const before = await counts()
  assert.equal(await db.mediaJob.count({ where: { activeResourceKey: { not: null } } }), 0)
  const run = randomUUID()
  const user = await db.user.create({ data: { email: `draft-recovery-${run}@example.invalid`, password: "test-no-login" } })
  const team = await db.team.create({ data: { slug: `draft-recovery-${run}`, nombre: "Draft recovery" } })
  await db.teamMembership.create({ data: { userId: user.id, teamId: team.id, role: "PLAYER" } })
  const tempBase = await realpath(tmpdir()), root = await realpath(await mkdtemp(join(tempBase, "media-draft-recovery-test-")))
  const children: ChildProcess[] = [], runtimes: MediaRuntime[] = [], owners: string[] = [], keys = new Set<string>()
  const kill = async (child: ChildProcess) => { if (child.exitCode === null && child.signalCode === null) { const closed = once(child, "close"); child.kill("SIGKILL"); await closed } }
  const waitFor = async (read: () => Promise<boolean>) => { for (let i = 0; i < 300; i++) { if (await read()) return; await delay(20) }; throw new Error("Recovery timeout") }
  try {
    const cases = [
      { kind: "draft", stage: "receiving" }, { kind: "draft", stage: "queued" }, { kind: "draft", stage: "processing" },
      { kind: "draft", stage: "publishing" }, { kind: "draft", stage: "committed" },
      { kind: "draft", stage: "publishing", discard: true }, { kind: "proposal", stage: "publishing" }, { kind: "proposal", stage: "committed" },
    ]
    for (const scenario of cases) await t.test(`${scenario.kind}: ${scenario.stage}${scenario.discard ? " + descarte antes del reinicio" : ""}`, async caseTest => {
      const draft = scenario.kind === "draft" ? await createDraft(user.id, team.id, "PROPOSAL", {}) : null
      const proposal = scenario.kind === "proposal" ? await db.propuestaLogro.create({ data: { teamId: team.id, userId: user.id, nombre: "Legacy", descripcion: "Preserve", criterios: ["Original"], imageRepairAllowed: true } }) : null
      const child = fork(join(__dirname, "../experiments/mediaRecoveryCrashProbe.js"), [], { env: { ...process.env, MEDIA_RECOVERY_CRASH_PROBE: "1" }, execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"] })
      children.push(child); caseTest.after(() => kill(child))
      let timer: NodeJS.Timeout | undefined
      const reached = new Promise<string>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Crash stage not reached")), 15_000)
        child.on("message", (message: { stage: string; runtimeOwnerId: string }) => {
          if (message.stage === "owner") owners.push(message.runtimeOwnerId)
          if (message.stage === "failed") reject(new Error("Crash probe failed"))
          if (message.stage === scenario.stage) resolve(message.runtimeOwnerId)
        }); child.once("error", reject); child.once("exit", () => reject(new Error("Probe exited early")))
      })
      child.send({ stage: scenario.stage, temporaryRoot: root, ownerId: user.id, teamId: team.id, ...(draft ? { draftId: draft.id } : { proposalId: proposal!.id }) })
      let ownerId: string
      try { ownerId = await reached } finally { if (timer) clearTimeout(timer) }
      const job = await db.mediaJob.findFirstOrThrow({ where: { runtimeOwnerId: ownerId }, orderBy: { createdAt: "desc" } })
      await kill(child)
      if (job.workerPid) await waitFor(async () => { try { process.kill(job.workerPid!, 0); return false } catch (error) { return error instanceof Error && "code" in error && error.code === "ESRCH" } })
      if (scenario.discard) await discardDraft(user.id, team.id, draft!.id, draft!.version)
      const runtime = await createMediaRuntime({ temporaryRoot: root, store: new ObjectStore(config), db, pollIntervalMs: 100 })
      runtimes.push(runtime); owners.push(runtime.ownerId)
      const recovered = await db.mediaJob.findUniqueOrThrow({ where: { id: job.id }, include: { asset: true } })
      const destination = draft ? await db.achievementDraft.findUniqueOrThrow({ where: { id: draft.id } }) : await db.propuestaLogro.findUniqueOrThrow({ where: { id: proposal!.id } })
      if (scenario.stage === "committed") {
        assert.equal(recovered.status, "SUCCEEDED"); assert.equal(destination.imageAssetId, recovered.asset!.id); assert.equal(recovered.asset!.state, "READY")
        if (proposal) assert.equal((await db.propuestaLogro.findUniqueOrThrow({ where: { id: proposal.id } })).imageRepairAllowed, false)
      } else {
        assert.equal(recovered.status, scenario.discard ? "CANCELED" : "INTERRUPTED"); assert.equal(destination.imageAssetId, null)
        assert.equal(recovered.activeResourceKey, null); assert.equal(recovered.processingSlot, null)
        if (recovered.asset) assert.equal(recovered.asset.state, "RETIRED")
      }
      if (recovered.asset) for (const v of mediaAssetVariantSchema.array().parse(recovered.asset.variants)) {
        keys.add(v.key)
        if (scenario.stage === "committed") assert.ok(await verifier.head(v.key)); else assert.equal(await verifier.head(v.key), null)
      }
      await assert.rejects(lstat(join(root, job.id)), { code: "ENOENT" })
      await runtime.stop()
      if (draft && !scenario.discard) await discardDraft(user.id, team.id, draft.id, (await db.achievementDraft.findUniqueOrThrow({ where: { id: draft.id } })).version)
    })
  } finally {
    for (const child of children) await kill(child)
    for (const runtime of runtimes) await runtime.stop()
    for (const asset of await db.mediaAsset.findMany({ where: { teamId: team.id } })) for (const v of mediaAssetVariantSchema.array().parse(asset.variants)) keys.add(v.key)
    for (const key of keys) { await verifier.delete(key); assert.equal(await verifier.head(key), null) }
    await db.achievementDraft.deleteMany({ where: { teamId: team.id } }); await db.propuestaLogro.deleteMany({ where: { teamId: team.id } })
    await db.mediaAssetCleanup.deleteMany({ where: { asset: { teamId: team.id } } }); await db.mediaAsset.deleteMany({ where: { teamId: team.id } })
    await db.mediaJob.deleteMany({ where: { teamId: team.id } }); await db.mediaRuntimeOwner.deleteMany({ where: { id: { in: owners } } })
    await db.teamMembership.deleteMany({ where: { teamId: team.id } }); await db.team.delete({ where: { id: team.id } }); await db.user.delete({ where: { id: user.id } })
    assert.equal(dirname(root), tempBase); assert.ok(root.startsWith(join(tempBase, "media-draft-recovery-test-"))); assert.equal(await realpath(root), root); await rm(root, { recursive: true })
    assert.deepEqual(await counts(), before)
    verifier.destroy(); await db.$disconnect()
  }
})
