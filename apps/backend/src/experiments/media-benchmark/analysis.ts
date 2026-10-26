import type { WorkerMetric } from "./metrics"

export type WorkerEvent = { attempt: string; pid: number; jobId: string; event: string; at: string }

// Sin la prueba de nacimiento/cierre no podemos decidir qué procesos se solapan.
// La ausencia de una muestra debe fallar la medición, nunca reducir su pico a cero.
export function completeWorkerLifecycle(workers: WorkerMetric[], events: WorkerEvent[], expected: number): boolean {
  return workers.length === expected && new Set(workers.map((worker) => worker.attempt)).size === expected
    && events.length === expected * 4 && workers.every((worker) => {
      const own = events.filter((event) => event.attempt === worker.attempt)
      const at = (name: string) => Date.parse(own.find((event) => event.event === name)?.at ?? "")
      return ["spawn", "started", "processed", "close"].every((name) => own.filter((event) => event.event === name).length === 1)
        && own.every((event) => event.pid === worker.pid && event.jobId === worker.jobId)
        && at("spawn") <= at("started") && at("started") <= at("processed") && at("processed") <= at("close")
    })
}
