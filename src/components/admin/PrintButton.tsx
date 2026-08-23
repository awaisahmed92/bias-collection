"use client";
import { IconPrint } from "@/components/ui/icons";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="admin-btn-outline">
      <IconPrint className="h-4 w-4" /> Print Invoice
    </button>
  );
}
