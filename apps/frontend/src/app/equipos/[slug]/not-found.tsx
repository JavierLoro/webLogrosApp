import Link from "next/link";
import { EmptyState } from "@/components/feedback/FeedbackState";
import { buttonClassName } from "@/components/ui/Button";

export default function NotFound() {
  return <EmptyState title="No encontramos este registro" description="El equipo o logro no existe, o ya no está disponible." action={<Link className={buttonClassName("secondary")} href="/">Volver al inicio</Link>} />;
}
