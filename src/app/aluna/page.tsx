"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function BellAnnouncementIcon() {
  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
      <svg
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs select-none"
        aria-hidden="true"
      >
        {/* Dynamic motion lines on the left */}
        <path
          d="M13 29C10 32 8 36 8 40"
          stroke="#C89196"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M9 23C7 26 5 30 5 34"
          stroke="#C89196"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M17 19L11 16"
          stroke="#C89196"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Bell group with slight tilt */}
        <g transform="rotate(-12 36 36)">
          {/* Top Ring/Loop */}
          <ellipse cx="36" cy="14" rx="4" ry="3" fill="#C89196" />
          <path
            d="M36 15.5V19.5"
            stroke="#B77D82"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Bell Body */}
          <path
            d="M26 25C26 19.5 30.5 15 36 15C41.5 15 46 19.5 46 25V37C46 41 51 44 52 47C52.5 48.5 51.5 50 49.5 50H22.5C20.5 50 19.5 48.5 20 47C21 44 26 41 26 37V25Z"
            fill="url(#bellGradient)"
          />

          {/* Clapper */}
          <ellipse cx="36" cy="52" rx="4.5" ry="3.5" fill="#8E4850" />

          {/* Subtle Sheen Highlight */}
          <path
            d="M29 26C29 22 31.5 19 34 18.5"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>

        <defs>
          <linearGradient id="bellGradient" x1="20" y1="15" x2="52" y2="50" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ECAAB0" />
            <stop offset="0.55" stopColor="#B77D82" />
            <stop offset="1" stopColor="#9C5D64" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function CalendarAnnouncementIcon() {
  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
      <svg
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs select-none"
        aria-hidden="true"
      >
        {/* Sparkles / motion lines on top-right */}
        <path
          d="M58 16L63 13"
          stroke="#C89196"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M60 23L65 24"
          stroke="#C89196"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M53 11L55 6"
          stroke="#C89196"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.65"
        />

        {/* Calendar Body with subtle tilt */}
        <g transform="rotate(-6 36 38)">
          {/* Main Card */}
          <rect
            x="18"
            y="20"
            width="36"
            height="36"
            rx="8"
            fill="url(#calGradient)"
          />

          {/* Header Bar */}
          <path
            d="M18 28C18 23.58 21.58 20 26 20H46C50.42 20 54 23.58 54 28V30H18V28Z"
            fill="#8E4850"
          />

          {/* Spiral / Binding Rings */}
          <rect x="25" y="16" width="3.5" height="7" rx="1.75" fill="#FAF7F2" />
          <rect x="43" y="16" width="3.5" height="7" rx="1.75" fill="#FAF7F2" />

          {/* Days Grid Dots */}
          <circle cx="27" cy="37" r="1.8" fill="#FFFFFF" opacity="0.9" />
          <circle cx="36" cy="37" r="1.8" fill="#FFFFFF" opacity="0.9" />
          <circle cx="45" cy="37" r="1.8" fill="#FFFFFF" opacity="0.9" />
          <circle cx="27" cy="45" r="1.8" fill="#FFFFFF" opacity="0.9" />
          <circle cx="36" cy="45" r="1.8" fill="#FFFFFF" opacity="0.9" />
          <circle cx="45" cy="45" r="1.8" fill="#FFFFFF" opacity="0.9" />
        </g>

        <defs>
          <linearGradient id="calGradient" x1="18" y1="20" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ECAAB0" />
            <stop offset="0.55" stopColor="#B77D82" />
            <stop offset="1" stopColor="#9C5D64" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <div className="max-w-md mx-auto space-y-6 sm:space-y-7 animate-fade-in py-2 sm:py-3">
      {/* 1. Saudação acolhedora e editorial */}
      <section className="space-y-1.5 pt-1">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-medium tracking-tight text-[#292321] leading-tight">
          Seu momento começa aqui.
        </h1>
        <p className="text-xs sm:text-sm text-[#827B77] leading-relaxed font-sans">
          Movimento, bem-estar e mais presença para todos os seus dias.
        </p>
      </section>

      {/* 2. Card: Mural de anúncios */}
      <section
        aria-label="Mural de anúncios"
        className="rounded-[28px] sm:rounded-[32px] bg-white border border-[#EADBCE] p-4 sm:p-6 shadow-[0_4px_24px_rgba(41,35,33,0.04)] space-y-3 sm:space-y-4"
      >
        <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#292321] text-center pt-1 pb-0.5">
          Mural de anúncios
        </h2>

        {/* Banner 1: Aulas novas todos os meses */}
        <div className="rounded-2xl sm:rounded-[22px] bg-gradient-to-r from-[#FDEEEF] via-[#FCE8EB] to-[#FCE2E6] border border-[#F6DCE0] p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 transition-transform duration-300 hover:scale-[1.01]">
          <BellAnnouncementIcon />
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-[#292321] font-normal leading-snug mb-0.5">
              Atualizações com
            </p>
            <p className="font-serif font-bold text-xl sm:text-2xl text-[#9C5D64] leading-[1.15]">
              aulas novas
              <br />
              todos os meses.
            </p>
          </div>
        </div>

        {/* Banner 2: Nosso primeiro desafio */}
        <div className="rounded-2xl sm:rounded-[22px] bg-gradient-to-r from-[#FDEEEF] via-[#FCE8EB] to-[#FCE2E6] border border-[#F6DCE0] p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 transition-transform duration-300 hover:scale-[1.01]">
          <CalendarAnnouncementIcon />
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-[#292321] font-normal leading-snug mb-0.5">
              Em breve,
            </p>
            <p className="font-serif font-bold text-xl sm:text-2xl text-[#9C5D64] leading-[1.15]">
              nosso primeiro
              <br />
              desafio.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Botão destacado de acesso a todas as aulas */}
      <section aria-label="Acesso às aulas" className="pt-1">
        <Link
          href="/aluna/programas"
          className="w-full py-4 sm:py-4.5 px-6 rounded-2xl bg-[#B77D82] hover:bg-[#A3676C] active:scale-[0.99] text-white font-serif font-medium text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-sm hover:shadow transition-all duration-200 group"
          id="btn-access-all-lessons"
        >
          <span>Acesse todas as aulas</span>
          <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </section>
    </div>
  );
}
