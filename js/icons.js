// Shared inline SVG icons for buttons / chrome (stroke-based, 24×24)

const attrs = `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;

export const ICONS = {
  chevronLeft: `<svg ${attrs}><path d="m15 18-6-6 6-6"/></svg>`,
  chevronRight: `<svg ${attrs}><path d="m9 18 6-6-6-6"/></svg>`,
  save: `<svg ${attrs}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  history: `<svg ${attrs}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>`,
  userPlus: `<svg ${attrs}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
  search: `<svg ${attrs}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  check: `<svg ${attrs}><path d="m5 13 4 4L19 7"/></svg>`,
  home: `<svg ${attrs}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`,
  file: `<svg ${attrs}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  plus: `<svg ${attrs}><path d="M12 5v14M5 12h14"/></svg>`,
  x: `<svg ${attrs}><path d="M18 6 6 18M6 6l12 12"/></svg>`
};

/** Label with leading icon for button innerHTML */
export function withIcon(iconKey, label) {
  const svg = ICONS[iconKey] || "";
  return `${svg}<span>${label}</span>`;
}
