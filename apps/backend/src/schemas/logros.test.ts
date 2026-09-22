import { test } from "node:test"
import assert from "node:assert/strict"
import { crearLogroSchema, progressDeltaSchema, achievementConfigurationSchema } from "./logros"
import { aceptarPropuestaSchema } from "./propuestas"

// 📚 La compatibilidad de la migración empieza en HTTP: un cliente antiguo sigue creando STANDARD público.
test("creación antigua conserva defaults conservadores", () => {
  const data = crearLogroSchema.parse({ nombre: "Primero", puntos: 10 })
  assert.equal(data.kind, "STANDARD")
  assert.equal(data.targetValue, null)
  assert.equal(data.isSecret, false)
  assert.equal(data.scope, "PERMANENT")
})

test("tipo y objetivo se validan juntos al crear y aprobar propuestas", () => {
  for (const schema of [crearLogroSchema, aceptarPropuestaSchema]) {
    const base = schema === crearLogroSchema ? { nombre: "Contador", puntos: 10 } : { puntos: 10 }
    for (const fields of [
      { kind: "PROGRESSIVE" }, { kind: "PROGRESSIVE", targetValue: null },
      { kind: "PROGRESSIVE", targetValue: 0 }, { kind: "PROGRESSIVE", targetValue: 1.5 },
      { kind: "STANDARD", targetValue: 1 }, { kind: "PROGRESSIVE", targetValue: 2147483648 },
    ]) assert.equal(schema.safeParse({ ...base, ...fields }).success, false)
    assert.equal(schema.safeParse({ ...base, kind: "PROGRESSIVE", targetValue: 2147483647, isSecret: true, scope: "SEASONAL" }).success, true)
  }
})

test("deltas son enteros positivos o negativos no nulos sin campos de tenant", () => {
  for (const delta of [1, -1, 2147483647, -2147483647]) assert.equal(progressDeltaSchema.safeParse({ userId: 1, delta }).success, true)
  for (const delta of [0, 0.1, NaN, Infinity, 2147483648, -2147483648]) assert.equal(progressDeltaSchema.safeParse({ userId: 1, delta }).success, false)
  assert.equal(progressDeltaSchema.safeParse({ userId: 1, delta: 1, teamId: 2 }).success, false)
})

test("configuración permite cambiar secreto sin reinterpretar objetivo, tipo o temporada", () => {
  assert.equal(achievementConfigurationSchema.safeParse({ isSecret: false }).success, true)
  assert.equal(achievementConfigurationSchema.safeParse({ isSecret: true, targetValue: 3 }).success, false)
  assert.equal(achievementConfigurationSchema.safeParse({ isSecret: "false" }).success, false)
})
