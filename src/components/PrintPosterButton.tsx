"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintPosterButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF2E93] to-[#00F0FF] px-4 py-2 text-xs font-bold text-[#0B0B14] shadow-lg"
      data-testid="print-poster-trigger-btn"
    >
      <Printer className="h-4 w-4" />
      <span>Print / Save Table-Tent PDF</span>
    </button>
  );
}
