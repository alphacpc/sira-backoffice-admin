# Task 6 report
Status: DONE. Build OK (/solution 1.5 kB, /faq still compiles). check-site: no "texte trop pâle"; only legacy "interdite" lines remain.
scrollWidth: 1280 at 1280; 390 at 390 (after scrolling to bottom). One h1; anchors flotte/billetterie/colis/equipes/pilotage/faq present.
Visual: columns alternate, sticky mockup (top-28) does not clip under the header; "À venir" boxes and mobile layout fine.
Changes vs brief: overrides applied (grid-cols-1 [&>*]:min-w-0, focus-visible on chapter nav links); solution.ts audit-log point reworded.
Restarted stale `next start` on :3100 after build.

## Fix round
- faq.ts: survente question/answer qualified; data-separation answer qualified; space before `;` in prose.
- ui.tsx: Container applies max-w-6xl only when className has no max-w- utility.
- Build OK; no "texte trop pâle"; FAQ container on /solution at 1280px measures 768px.
