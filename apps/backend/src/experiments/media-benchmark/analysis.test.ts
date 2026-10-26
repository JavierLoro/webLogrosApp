import assert from "node:assert/strict"
import { test } from "node:test"
import { completeWorkerLifecycle, type WorkerEvent } from "./analysis"
import type { WorkerMetric } from "./metrics"

test("un cierre ausente o una identidad ajena no permiten aprobar la medición de memoria", () => {
  const worker = { attempt: "attempt-1", pid: 10, jobId: "job-1" } as WorkerMetric
  const events: WorkerEvent[] = ["spawn", "started", "processed", "close"].map((event, i) => ({
    attempt: worker.attempt, pid: worker.pid, jobId: worker.jobId, event, at: `2026-10-18T00:00:0${i}.000Z`,
  }))
  assert.equal(completeWorkerLifecycle([worker], events, 1), true)
  assert.equal(completeWorkerLifecycle([worker], events.slice(0, 3), 1), false)
  assert.equal(completeWorkerLifecycle([worker], events.map((event, i) => i === 3 ? { ...event, pid: 11 } : event), 1), false)
  assert.equal(completeWorkerLifecycle([worker], [...events.slice(0, 3), events[2]], 1), false)
  assert.equal(completeWorkerLifecycle([worker], [...events].reverse().map((event, i) => ({ ...event, at: events[i].at })), 1), false)
})
