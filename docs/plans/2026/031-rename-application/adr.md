# ADR: Application Name Selection

## Overview

This document records the research and evaluation of candidate names for renaming the application from "snappa". The rename is necessary because the current name conflicts with existing applications.

## Context

The application "snappa" needs a new name. Candidates were evaluated on three criteria:

- **Software namespace conflicts** — existing apps, packages, or tools with the same name
- **Trademark risk** — registered trademarks in relevant categories (software, technology)
- **Cross-language connotations** — unintended meanings in other languages or slang

## Candidates Evaluated

### 1. Suitto

**Software conflicts: YES**
- **Suitto** (Lawson Bank, Japan) — electronic money charging app on [Google Play](https://play.google.com/store/apps/details?id=jp.lawsonbank.mcs.app&hl=en_US) and [App Store](https://apps.apple.com/jp/app/suitto-%E3%82%B9%E3%83%9E%E3%83%9B%E3%81%A7%E3%82%B9%E3%82%A4%E3%83%83%E3%81%A8%E3%83%81%E3%83%A3%E3%83%BC%E3%82%B8/id1600430141)
- **Suitto Eyewear** — Barcelona-based eyewear brand

**Trademark risk: HIGH**
- [WIPO trademark registered](https://www.trademarkelite.com/wipo/trademark/trademark-detail/1522396/Suitto) by GAMMA EXTRA, S.L. (Barcelona) covering "Computer Product, Electrical & Scientific Products; Clothing Products"

**Cross-language connotations:** No problematic meanings found.

**Verdict: Not recommended.** Direct software conflict in Japan (same market) and WIPO trademark covers computer products.

### 2. Sutto

**Software conflicts: NONE**
- No software, app, npm package, or GitHub repository found with this exact name
- Similar names exist (Suto, Sute) but with different spellings

**Trademark risk: LOW**
- No trademark registrations found for "Sutto" in software/technology categories

**Cross-language connotations: MINOR**
- Australian slang ([Urban Dictionary](https://www.urbandictionary.com/define.php?term=Sutto)): refers to "a reclusive wombat renowned for constant lying, complaining and whinging" — very niche, unlikely to cause issues
- Similar to Italian "sotto" (meaning "under/below") but different spelling

**Verdict: Recommended.** No software conflicts, low trademark risk, only very minor slang concern.

### 3. Shutto

**Software conflicts: YES (multiple)**
- **Shutto** (SHUTTO Logistics LLC) — shuttle booking app on [App Store](https://apps.apple.com/us/app/shutto/id6748967006) and [Google Play](https://play.google.com/store/apps/details?id=us.com.stgt.shutto)
- **shutto translation** — website multilingual tool on [Capterra](https://www.capterra.com/p/248894/shutto/) and [Chrome Web Store](https://chromewebstore.google.com/detail/shutto-translation-develo/cfbffmhgcmlakhpicddbjjpjadjcpaeb?hl=en)
- **shutto** — [GitHub CLI tool](https://github.com/garigari-kun/shutto) for opening GitHub pages

**Trademark risk: HIGH**
- [USPTO trademark registered](https://uspto.report/TM/99481595) by SHUTTO Logistics LLC for downloadable mobile applications

**Cross-language connotations:** Japanese onomatopoeia "シュッと" meaning "quickly/swiftly" — positive connotation, no issues.

**Verdict: Not recommended.** Multiple software conflicts and USPTO trademark registered for mobile applications.

## Comparison Summary

| Criterion          | Suitto         | Sutto              | Shutto         |
| ------------------ | -------------- | ------------------- | -------------- |
| Software conflicts | Yes (Japan)    | **None**            | Yes (multiple) |
| Trademark risk     | High (WIPO)    | **Low**             | High (USPTO)   |
| Slang concerns     | None           | Minor (AU, niche)   | None           |
| Overall            | Not recommended | **Recommended**    | Not recommended |

## Decision

**Sutto.** No software namespace conflicts, low trademark risk, and only a very niche Australian slang concern. The other candidates (Suitto, Shutto) both have existing software conflicts and registered trademarks in relevant categories.

## Research Date

2026-02-08
