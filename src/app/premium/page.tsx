import type { Metadata } from "next";
import { Tracker } from "@/components/Tracker";

export const metadata: Metadata = { title: "Energy tracker — Bill Shock" };

export default function PremiumPage() {
  return <Tracker />;
}
