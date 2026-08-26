"use client";

import { ErrorState } from "@/components/feedback/FeedbackState";
import { Button } from "@/components/ui/Button";

export default function TeamError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState description="El equipo no se ha podido cargar. Puedes volver a intentarlo." action={<Button onClick={reset}>Reintentar</Button>} />;
}
