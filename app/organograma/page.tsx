import type { Metadata } from "next";
import { OrgChartExplorer } from "@/app/components/OrgChartExplorer";

export const metadata: Metadata = {
  title: "Organograma · Revisão do Regimento Interno",
};

export default function OrganogramaPage() {
  return <OrgChartExplorer />;
}
