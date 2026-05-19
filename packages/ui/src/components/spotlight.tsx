import React from "react";

export function Spotlight({ className, fill }: { className?: string, fill?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className || ""}`}>
      {/* Spotlight Placeholder */}
    </div>
  );
}
