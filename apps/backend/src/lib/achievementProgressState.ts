export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "ELIGIBLE" | "AWARDED"

// 📚 Estado derivado evita dos fuentes de verdad: solo UserLogro acredita la concesión,
// 📚 mientras un contador completo habilita la revisión manual, sin otorgar puntos.
export function progressState(currentValue: number, targetValue: number, awarded: boolean): ProgressStatus {
  if (awarded) return "AWARDED"
  if (currentValue >= targetValue) return "ELIGIBLE"
  return currentValue > 0 ? "IN_PROGRESS" : "NOT_STARTED"
}

export function progressDTO(currentValue: number, targetValue: number, seasonId: number | null, awarded: boolean) {
  return { currentValue, targetValue, seasonId, status: progressState(currentValue, targetValue, awarded) }
}
