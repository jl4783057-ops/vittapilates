---
version: 1.0.0
name: Pilates em Casa Design System
description: Visual language for Pilates em Casa Micro SaaS - warm, feminine, minimalist, welcoming, and sophisticated.
colors:
  background: "#FAF7F2"
  card: "#FFFFFF"
  primary: "#B77D82"
  primaryHover: "#A3676C"
  primaryLight: "#F7EEEE"
  softPink: "#EBD6D5"
  warmBeige: "#F3EAE3"
  textPrimary: "#292321"
  textSecondary: "#827B77"
  border: "#EADBCE"
typography:
  display:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
  heading:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  subheading:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 8px
  md: 14px
  lg: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  primaryButton:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.card}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
---

# Pilates em Casa - Design System

## Overview
Pilates em Casa é um Micro SaaS com experiência premium, feminina, minimalista, acolhedora e sofisticada. A área da aluna é prioritariamente mobile-first, transmitindo paz, saúde e consistência. O painel administrativo é desktop-first com visual refinado e clareza analítica.

## Colors
- **Fundo Principal (`#FAF7F2`)**: Off-white quente e sereno que evita o cansaço visual do branco puro.
- **Rosa Queimado (`#B77D82`)**: Tom primário para botões principais, destaques ativos e estados de foco.
- **Rosa Suave (`#EBD6D5`)**: Tom secundário para badges sutis, barras de progresso e seleções leves.
- **Bege Quente (`#F3EAE3`)**: Usado em divisórias suaves, fundos de cards secundários e chips.
- **Texto Principal (`#292321`)**: Marrom escuro profundo com alto contraste acessível e elegância orgânica.
- **Texto Secundário (`#827B77`)**: Tom suave para legendas, descrições e metadados.

## Typography
- **Títulos**: `Playfair Display` — serifada elegante e clássica, trazendo distinção e cuidado.
- **Interface e Textos**: `Inter` — legibilidade neutra, moderna e confortável para telas móveis e tabelas.

## Elevation & Depth
- Sombras levíssimas (`rgba(41, 35, 33, 0.04)`), valorizando bordas arredondadas e divisores sutis em vez de elevações pesadas.
- Superfícies de vidro com desfoque delicado (`backdrop-blur-md`) em menus inferiores fixos e barras de navegação.

## Do's and Don'ts
- **DO**: Usar cantos arredondados confortáveis (`rounded-2xl`, `rounded-full`), espaçamento arejado e micro-animações suaves.
- **DO**: Focar em linguagem acolhedora, respeitosa e sem cobrança estética corporal.
- **DON'T**: Usar roxos, azuis elétricos, neon ou gradientes agressivos.
- **DON'T**: Usar elementos pesados ou banners gigantes com visual genérico de curso online.
