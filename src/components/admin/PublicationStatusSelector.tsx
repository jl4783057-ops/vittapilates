"use client";

import React from "react";
import { PublicationStatus } from "@/types";
import { CheckCircle2, Clock, EyeOff, AlertTriangle } from "lucide-react";

interface PublicationStatusSelectorProps {
  value: PublicationStatus;
  onChange: (status: PublicationStatus) => void;
  disabled?: boolean;
  label?: string;
  parentNotice?: string;
}

export const PUBLICATION_STATUS_CONFIG: Record<
  PublicationStatus,
  {
    label: string;
    description: string;
    badgeClass: string;
    activeBorderClass: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }
> = {
  available: {
    label: "Disponível",
    description: "Aparece normalmente para as alunas, com banner e conteúdo acessíveis.",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    activeBorderClass: "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600",
    icon: CheckCircle2,
    accentColor: "#059669",
  },
  updating: {
    label: "Em atualização",
    description: "Visível no site com banner esmaecido e aviso claro. Aulas bloqueadas.",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    activeBorderClass: "border-amber-600 bg-amber-50/40 ring-1 ring-amber-600",
    icon: Clock,
    accentColor: "#D97706",
  },
  hidden: {
    label: "Oculta",
    description: "Invisível em toda a área da aluna (listas, buscas e home) e bloqueada por URL.",
    badgeClass: "bg-stone-100 text-stone-700 border-stone-200",
    activeBorderClass: "border-stone-500 bg-stone-50 ring-1 ring-stone-500",
    icon: EyeOff,
    accentColor: "#78716C",
  },
};

export function PublicationStatusSelector({
  value,
  onChange,
  disabled = false,
  label = "Estado de Publicação",
  parentNotice,
}: PublicationStatusSelectorProps) {
  const options: PublicationStatus[] = ["available", "updating", "hidden"];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#827B77] block">
          {label}
        </label>
        <span className="text-[10px] text-[#827B77]">
          3 estados independentes
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => {
          const cfg = PUBLICATION_STATUS_CONFIG[opt];
          const Icon = cfg.icon;
          const isSelected = value === opt;

          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`p-3 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                isSelected
                  ? cfg.activeBorderClass
                  : "border-[#EADBCE] bg-[#FAF7F2] hover:bg-[#FAF7F2]/80 hover:border-[#B77D82]/50"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                  isSelected
                    ? "bg-white border-current shadow-2xs"
                    : "border-[#EADBCE] bg-white text-[#827B77]"
                }`}
                style={isSelected ? { color: cfg.accentColor, borderColor: cfg.accentColor } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#292321]">
                    {cfg.label}
                  </span>
                  {isSelected && (
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.2 rounded-full border ${cfg.badgeClass}`}
                    >
                      Selecionado
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#827B77] leading-relaxed">
                  {cfg.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {parentNotice && (
        <div className="mt-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{parentNotice}</span>
        </div>
      )}
    </div>
  );
}

interface PublicationStatusSegmentedProps {
  currentStatus: PublicationStatus;
  onChange: (status: PublicationStatus) => void;
  disabled?: boolean;
  size?: "sm" | "xs";
}

export function PublicationStatusSegmented({
  currentStatus,
  onChange,
  disabled = false,
  size = "sm",
}: PublicationStatusSegmentedProps) {
  const options: PublicationStatus[] = ["available", "updating", "hidden"];

  return (
    <div
      className={`inline-flex items-center bg-[#FAF7F2] border border-[#EADBCE] rounded-full p-0.5 shadow-2xs ${
        disabled ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      {options.map((opt) => {
        const isSelected = currentStatus === opt;
        const cfg = PUBLICATION_STATUS_CONFIG[opt];

        let activeStyle = "";
        if (isSelected) {
          if (opt === "available") activeStyle = "bg-emerald-600 text-white shadow-2xs";
          else if (opt === "updating") activeStyle = "bg-amber-600 text-white shadow-2xs";
          else activeStyle = "bg-stone-600 text-white shadow-2xs";
        } else {
          activeStyle = "text-[#827B77] hover:text-[#292321] hover:bg-white/60";
        }

        return (
          <button
            key={opt}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(opt);
            }}
            disabled={disabled}
            className={`rounded-full font-semibold transition cursor-pointer whitespace-nowrap ${
              size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
            } ${activeStyle}`}
            title={`Alterar para ${cfg.label}: ${cfg.description}`}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

export function PublicationStatusBadge({
  status,
  size = "sm",
}: {
  status: PublicationStatus;
  size?: "sm" | "xs";
}) {
  const cfg = PUBLICATION_STATUS_CONFIG[status] || PUBLICATION_STATUS_CONFIG.available;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${cfg.badgeClass} ${
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <Icon className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span>{cfg.label}</span>
    </span>
  );
}
