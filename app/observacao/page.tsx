import type { Metadata } from "next";
import { ObservationWorkspace } from "@/app/components/ObservationWorkspace";

export const metadata: Metadata = {
  title: "Observações · Revisão do Regimento Interno",
};

export default function ObservacaoPage() {
  return <ObservationWorkspace />;
}
