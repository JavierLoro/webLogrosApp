import { test } from "node:test"
import assert from "node:assert/strict"
import { progressDTO, progressState } from "./achievementProgressState"

// 📚 Probamos las fronteras del dominio, no Prisma: alcanzar el objetivo nunca otorga por sí solo.
test("el contador distingue no iniciado, parcial y elegible sin conceder", () => {
  assert.equal(progressState(0, 10, false), "NOT_STARTED")
  assert.equal(progressState(4, 10, false), "IN_PROGRESS")
  assert.equal(progressState(10, 10, false), "ELIGIBLE")
})

test("una corrección descendente devuelve el estado parcial o no iniciado", () => {
  assert.equal(progressState(10, 10, false), "ELIGIBLE")
  assert.equal(progressState(9, 10, false), "IN_PROGRESS")
  assert.equal(progressState(0, 10, false), "NOT_STARTED")
})

test("solo la concesión persistida produce AWARDED y el contexto se conserva", () => {
  assert.deepEqual(progressDTO(10, 10, 17, true), { currentValue: 10, targetValue: 10, seasonId: 17, status: "AWARDED" })
  assert.equal(progressDTO(10, 10, null, false).seasonId, null)
  assert.equal(progressState(0, 10, true), "AWARDED")
})
