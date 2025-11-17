"use client";

import { useState } from "react";

type EventTabsProps = {
  overview?: string | null;
  rules?: string | null;
};

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "rules", label: "Rules" }
] as const;

export function EventTabs({ overview, rules }: EventTabsProps) {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("overview");

  const content =
    active === "overview"
      ? overview ?? "Organizer has not added an overview yet."
      : rules ?? "No rules provided for this event yet.";

  return (
    <div className="card p-6">
      <div className="flex gap-3 border-b border-white/10 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              active === tab.id
                ? "bg-polka-pink text-white"
                : "bg-white/5 text-slate-300"
            }`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3 text-sm text-slate-300">
        {content.split("\n").map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </div>
    </div>
  );
}
