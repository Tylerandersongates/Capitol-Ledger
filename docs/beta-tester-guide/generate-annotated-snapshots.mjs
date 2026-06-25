import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const imageDir = join(__dirname, "images");

const canvas = { width: 760, height: 860 };
const phone = { x: 34, y: 30, width: 360, height: 790 };
const screen = { x: phone.x + 16, y: phone.y + 16, width: phone.width - 32, height: phone.height - 32 };

const palette = {
  bg0: "#010817",
  bg1: "#071a34",
  bg2: "#0b2347",
  brass: "#ffb12b",
  brass2: "#ffd45c",
  blue: "#2384ff",
  blueSoft: "#79a8ff",
  green: "#43ed74",
  purple: "#b98fff",
  white: "#f7f9ff",
  muted: "#94a3b8",
  line: "rgba(255,255,255,0.16)",
  card: "rgba(12,38,78,0.76)",
  card2: "rgba(19,64,115,0.64)"
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrap(text, limit = 30) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length <= limit) {
      current = `${current} ${word}`;
      continue;
    }
    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function textBlock({ text, x, y, width = 30, size = 13, fill = palette.white, weight = 500, lineHeight = 17, opacity = 1 }) {
  return wrap(text, width)
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;
      return `<text x="${x}" y="${y + dy}" fill="${fill}" fill-opacity="${opacity}" font-size="${size}" font-weight="${weight}">${esc(line)}</text>`;
    })
    .join("");
}

function pill({ x, y, width, height = 24, label, tone = palette.brass, size = 12 }) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${tone}" fill-opacity="0.12" stroke="${tone}" stroke-opacity="0.55"/>
    <text x="${x + width / 2}" y="${y + height / 2 + 4}" text-anchor="middle" fill="${tone}" font-size="${size}" font-weight="700">${esc(label)}</text>
  `;
}

function card({ x, y, width, height, title, subtitle, eyebrow, accent = palette.blue, children = "" }) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="url(#cardGradient)" stroke="rgba(255,255,255,0.18)"/>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="${accent}" fill-opacity="0.05"/>
    ${eyebrow ? `<text x="${x + 16}" y="${y + 24}" fill="${accent}" font-size="10" font-weight="700" letter-spacing="1.4">${esc(eyebrow.toUpperCase())}</text>` : ""}
    ${title ? textBlock({ text: title, x: x + 16, y: y + (eyebrow ? 48 : 30), width: 24, size: 20, weight: 700, lineHeight: 23 }) : ""}
    ${subtitle ? textBlock({ text: subtitle, x: x + 16, y: y + (eyebrow ? 78 : 60), width: 34, size: 12.5, fill: palette.white, opacity: 0.62, weight: 500, lineHeight: 16 }) : ""}
    ${children}
  `;
}

function miniMetric({ x, y, width, label, value, tone = palette.brass, height = 54 }) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.11)"/>
    <text x="${x + 12}" y="${y + 23}" fill="${tone}" font-size="18" font-weight="700">${esc(value)}</text>
    <text x="${x + 12}" y="${y + Math.min(40, height - 12)}" fill="${palette.white}" fill-opacity="0.58" font-size="10" font-weight="700" letter-spacing="0.8">${esc(label.toUpperCase())}</text>
  `;
}

function row({ x, y, width, label, meta, tone = palette.brass, tag }) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="42" rx="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="${x + 17}" cy="${y + 21}" r="5" fill="${tone}"/>
    <text x="${x + 30}" y="${y + 20}" fill="${palette.white}" fill-opacity="0.86" font-size="12.5" font-weight="600">${esc(label)}</text>
    ${meta ? `<text x="${x + 30}" y="${y + 34}" fill="${palette.white}" fill-opacity="0.45" font-size="9.5">${esc(meta)}</text>` : ""}
    ${tag ? pill({ x: x + width - 78, y: y + 10, width: 62, height: 22, label: tag, tone, size: 10 }) : ""}
  `;
}

function bottomNav(active) {
  const labels = ["Home", "Bills", "Track", "Alerts", "Profile"];
  const icon = ["M10 22V12L20 5l10 7v10", "M11 6h14l4 4v20H11z", "M12 18l5 5 11-13", "M16 27h8", "M15 27c2-5 12-5 14 0"];
  const itemWidth = screen.width / labels.length;

  return `
    <rect x="0" y="692" width="${screen.width}" height="66" fill="rgba(2,11,28,0.92)" stroke="rgba(255,255,255,0.18)"/>
    ${labels
      .map((label, index) => {
        const x = itemWidth * index + itemWidth / 2;
        const isActive = label === active;
        const color = isActive ? palette.brass : palette.white;
        return `
          <circle cx="${x}" cy="716" r="16" fill="${isActive ? "rgba(255,177,43,0.12)" : "rgba(255,255,255,0.035)"}" stroke="${isActive ? "rgba(255,177,43,0.72)" : "rgba(255,255,255,0.12)"}"/>
          <path d="${icon[index]}" transform="translate(${x - 20} 695) scale(0.7)" fill="none" stroke="${color}" stroke-opacity="${isActive ? 1 : 0.82}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="${x}" y="750" text-anchor="middle" fill="${color}" fill-opacity="${isActive ? 1 : 0.82}" font-size="11.5" font-weight="500">${label}</text>
        `;
      })
      .join("")}
  `;
}

function appHeader({ title, eyebrow, back = false, rightLabel = "" }) {
  return `
    <text x="20" y="32" fill="${palette.white}" font-size="15" font-weight="700">9:41</text>
    <rect x="${screen.width - 48}" y="20" width="28" height="11" rx="4" fill="none" stroke="rgba(255,255,255,0.72)"/>
    <rect x="${screen.width - 45}" y="23" width="18" height="5" rx="2" fill="rgba(255,255,255,0.72)"/>
    ${back ? `<circle cx="35" cy="73" r="18" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.12)"/><path d="M40 64l-10 9 10 9" fill="none" stroke="${palette.white}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    ${eyebrow ? `<text x="${back ? 64 : 20}" y="70" fill="${palette.white}" fill-opacity="0.46" font-size="10" font-weight="700" letter-spacing="1.4">${esc(eyebrow.toUpperCase())}</text>` : ""}
    <text x="${back ? 64 : 20}" y="${eyebrow ? 96 : 84}" fill="${palette.white}" font-size="${title.length > 17 ? 22 : 26}" font-weight="700">${esc(title)}</text>
    ${rightLabel ? pill({ x: screen.width - 112, y: 62, width: 92, height: 30, label: rightLabel, tone: palette.brass, size: 12 }) : ""}
  `;
}

function defs(slug) {
  return `
    <defs>
      <linearGradient id="screenGradient-${slug}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${palette.bg1}"/>
        <stop offset="0.48" stop-color="${palette.bg0}"/>
        <stop offset="1" stop-color="#000511"/>
      </linearGradient>
      <linearGradient id="cardGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#134073" stop-opacity="0.64"/>
        <stop offset="1" stop-color="#0c264e" stop-opacity="0.76"/>
      </linearGradient>
      <clipPath id="screenClip-${slug}">
        <rect x="0" y="0" width="${screen.width}" height="${screen.height}" rx="34"/>
      </clipPath>
      <marker id="arrow-${slug}" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <path d="M1 1L11 6L1 11Z" fill="${palette.brass}"/>
      </marker>
      <filter id="softShadow-${slug}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000511" flood-opacity="0.42"/>
      </filter>
    </defs>
  `;
}

function grid() {
  const lines = [];
  for (let x = 0; x <= screen.width; x += 38) {
    lines.push(`<path d="M${x} 0V${screen.height}" stroke="rgba(255,255,255,0.045)" stroke-width="1"/>`);
  }
  for (let y = 0; y <= screen.height; y += 38) {
    lines.push(`<path d="M0 ${y}H${screen.width}" stroke="rgba(255,255,255,0.045)" stroke-width="1"/>`);
  }
  return lines.join("");
}

function callouts(slug, items) {
  return items
    .map((item) => {
      const lines = wrap(item.text, 28);
      const boxHeight = 28 + lines.length * 15;
      const labelX = item.labelX ?? 430;
      const labelY = item.labelY;
      const targetX = screen.x + item.x;
      const targetY = screen.y + item.y;
      const startX = labelX;
      const startY = labelY + boxHeight / 2;
      const curveX = Math.max(startX - 42, targetX + 46);

      return `
        <path d="M${startX} ${startY} C${curveX} ${startY}, ${curveX} ${targetY}, ${targetX + 18} ${targetY}" fill="none" stroke="${palette.brass}" stroke-width="2.5" stroke-linecap="round" marker-end="url(#arrow-${slug})"/>
        <circle cx="${targetX}" cy="${targetY}" r="14" fill="${palette.brass}" stroke="${palette.white}" stroke-width="2.5"/>
        <text x="${targetX}" y="${targetY + 5}" text-anchor="middle" fill="#061126" font-size="14" font-weight="800">${item.number}</text>
        <g filter="url(#softShadow-${slug})">
          <rect x="${labelX}" y="${labelY}" width="278" height="${boxHeight}" rx="14" fill="rgba(7,20,43,0.96)" stroke="rgba(255,177,43,0.42)"/>
          <circle cx="${labelX + 21}" cy="${labelY + 22}" r="11" fill="${palette.brass}"/>
          <text x="${labelX + 21}" y="${labelY + 27}" text-anchor="middle" fill="#061126" font-size="13" font-weight="800">${item.number}</text>
          ${lines
            .map((line, index) => `<text x="${labelX + 42}" y="${labelY + 23 + index * 15}" fill="${palette.white}" fill-opacity="0.88" font-size="12.5" font-weight="600">${esc(line)}</text>`)
            .join("")}
        </g>
      `;
    })
    .join("");
}

function frame(slug, content, calloutItems) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-labelledby="title-${slug} desc-${slug}">
  <title id="title-${slug}">Annotated Capitol Ledger CE ${slug} snapshot</title>
  <desc id="desc-${slug}">A mobile app screen map with numbered arrows pointing to beta testing areas.</desc>
  ${defs(slug)}
  <rect width="${canvas.width}" height="${canvas.height}" fill="#f5f7fb"/>
  <rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="url(#screenGradient-${slug})" opacity="0.08"/>
  <text x="430" y="44" fill="#061126" font-size="22" font-weight="800">Tester callouts</text>
  <text x="430" y="67" fill="#38506f" font-size="13" font-weight="600">Use these labels when reviewing the page.</text>
  <g filter="url(#softShadow-${slug})">
    <rect x="${phone.x}" y="${phone.y}" width="${phone.width}" height="${phone.height}" rx="54" fill="#020713" stroke="#1d293b" stroke-width="8"/>
    <rect x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" rx="34" fill="url(#screenGradient-${slug})" stroke="rgba(255,255,255,0.68)" stroke-width="1.5"/>
  </g>
  <g clip-path="url(#screenClip-${slug})" transform="translate(${screen.x} ${screen.y})">
    ${grid()}
    ${content}
  </g>
  ${callouts(slug, calloutItems)}
</svg>
`;
}

function dashboard() {
  const content = `
    ${appHeader({ title: "Civic Dashboard", eyebrow: "Command Center", rightLabel: "View All" })}
    <circle cx="56" cy="75" r="30" fill="rgba(255,177,43,0.14)" stroke="${palette.brass}" stroke-opacity="0.72"/>
    <text x="88" y="75" fill="${palette.white}" font-size="13" font-weight="800" letter-spacing="2">CAPITOL</text>
    <text x="88" y="94" fill="${palette.brass}" font-size="13" font-weight="800" letter-spacing="2">LEDGER</text>
    ${card({ x: 18, y: 138, width: 292, height: 174, eyebrow: "Live docket", title: "Today in Congress", subtitle: "Bills moving through the ledger", accent: palette.brass, children: `
      <rect x="38" y="230" width="250" height="9" rx="5" fill="#06152d"/>
      <rect x="38" y="230" width="78" height="9" rx="5" fill="#28c98a"/>
      <rect x="116" y="230" width="82" height="9" fill="#ffc047"/>
      <rect x="198" y="230" width="90" height="9" rx="5" fill="#2f9fff"/>
      ${miniMetric({ x: 38, y: 247, width: 76, label: "Passed", value: "12", tone: "#28c98a" })}
      ${miniMetric({ x: 125, y: 247, width: 76, label: "Committee", value: "34", tone: "#ffc047" })}
      ${miniMetric({ x: 212, y: 247, width: 76, label: "Progress", value: "18", tone: "#2f9fff" })}
    ` })}
    ${card({ x: 18, y: 328, width: 292, height: 150, eyebrow: "Favorites", title: "Saved civic watchlist", subtitle: "", accent: palette.brass, children: `
      ${row({ x: 35, y: 380, width: 258, label: "Rep. district watch", meta: "Pinned official", tone: palette.brass })}
      ${row({ x: 35, y: 426, width: 258, label: "Healthcare bill", meta: "Tracked bill", tone: palette.blue })}
    ` })}
    ${card({ x: 18, y: 494, width: 292, height: 184, eyebrow: "Civic Engagement", title: "Civic Momentum", subtitle: "Score, streaks, badges, and action impact", accent: palette.green, children: `
      ${miniMetric({ x: 35, y: 578, width: 122, label: "Score", value: "0", tone: palette.brass, height: 46 })}
      ${miniMetric({ x: 170, y: 578, width: 122, label: "Streak", value: "1d", tone: palette.brass, height: 46 })}
      ${row({ x: 35, y: 632, width: 122, label: "Letters Sent", tone: palette.green })}
      ${row({ x: 170, y: 632, width: 122, label: "Petitions", tone: palette.purple })}
    ` })}
    ${bottomNav("Home")}
  `;

  return frame("dashboard", content, [
    { number: 1, x: 246, y: 199, labelY: 96, text: "Live docket counts open filtered bill results for a fast smoke check." },
    { number: 2, x: 92, y: 404, labelY: 205, text: "Saved watchlist should update after a tester follows bills or officials." },
    { number: 3, x: 72, y: 600, labelY: 320, text: "Civic Momentum summarizes score, streak, badge, and action progress." },
    { number: 4, x: 88, y: 654, labelY: 448, text: "Action category rows open the ledger views, including letters and petitions." },
    { number: 5, x: 164, y: 724, labelY: 588, text: "Bottom navigation should stay tappable and consistent across pages." }
  ]);
}

function impact() {
  const content = `
    ${appHeader({ title: "Your Impact", back: true })}
    ${card({ x: 18, y: 116, width: 292, height: 104, title: "Civic Score", subtitle: "+0 this month", accent: palette.brass, children: `
      <text x="38" y="190" fill="${palette.brass}" font-size="42" font-weight="800">0</text>
      <circle cx="248" cy="164" r="34" fill="rgba(255,177,43,0.12)" stroke="${palette.brass}" stroke-opacity="0.58"/>
      <rect x="204" y="205" width="88" height="7" rx="4" fill="rgba(255,255,255,0.13)"/>
      <rect x="204" y="205" width="22" height="7" rx="4" fill="${palette.brass}"/>
    ` })}
    ${card({ x: 18, y: 236, width: 292, height: 104, title: "Voter Registration", subtitle: "Complete a Voter Registration Form", accent: palette.blueSoft, children: `
      ${pill({ x: 256, y: 252, width: 38, height: 24, label: "0/1", tone: palette.white, size: 10 })}
      <rect x="38" y="306" width="252" height="32" rx="10" fill="rgba(121,168,255,0.12)" stroke="rgba(121,168,255,0.34)"/>
      <text x="164" y="327" text-anchor="middle" fill="#b8d2ff" font-size="12" font-weight="700">Mark Form Complete</text>
    ` })}
    ${card({ x: 18, y: 356, width: 292, height: 236, title: "Election Participation", subtitle: "Primary, general, runoff, and special elections", accent: palette.brass, children: `
      ${pill({ x: 250, y: 372, width: 44, height: 24, label: "0/6", tone: palette.white, size: 10 })}
      ${row({ x: 36, y: 430, width: 256, label: "2026 Primary Election", tone: palette.brass, tag: "Primary" })}
      ${row({ x: 36, y: 478, width: 256, label: "2026 General Election", tone: palette.brass, tag: "General" })}
      ${row({ x: 36, y: 526, width: 256, label: "2027 District Special", tone: palette.green, tag: "Special" })}
      <rect x="36" y="574" width="256" height="34" rx="11" fill="rgba(67,237,116,0.08)" stroke="rgba(67,237,116,0.24)"/>
      <text x="55" y="596" fill="#8ef8af" font-size="11.5" font-weight="600">Log 6 unique elections for Super Voter.</text>
    ` })}
    ${card({ x: 18, y: 608, width: 292, height: 78, title: "Engagement Streak", subtitle: "1 Day - keep it going", accent: palette.brass })}
    ${bottomNav("Alerts")}
  `;

  return frame("impact", content, [
    { number: 1, x: 248, y: 165, labelY: 94, text: "Civic Score and XP should change after actions are completed." },
    { number: 2, x: 164, y: 321, labelY: 205, text: "Voter Registration is a completion input for the Register to Vote badge." },
    { number: 3, x: 270, y: 384, labelY: 318, text: "Election progress now uses all six listed elections." },
    { number: 4, x: 74, y: 452, labelY: 450, text: "Election rows log on one tap and remove on the next tap." },
    { number: 5, x: 168, y: 650, labelY: 598, text: "Streak and impact breakdown should feel clear, premium, and trustworthy." }
  ]);
}

function badges() {
  const content = `
    ${appHeader({ title: "Badges", back: true })}
    <rect x="34" y="116" width="260" height="42" rx="21" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
    <rect x="206" y="121" width="82" height="32" rx="16" fill="rgba(255,177,43,0.13)"/>
    <text x="76" y="143" fill="${palette.white}" fill-opacity="0.56" font-size="13" font-weight="700">All</text>
    <text x="152" y="143" fill="${palette.white}" fill-opacity="0.56" font-size="13" font-weight="700">Earned</text>
    <text x="247" y="143" text-anchor="middle" fill="${palette.brass}" font-size="13" font-weight="800">Locked</text>
    ${card({ x: 18, y: 178, width: 292, height: 146, title: "Progress", subtitle: "Badges earned and level state", accent: palette.brass, children: `
      <text x="38" y="258" fill="${palette.brass}" font-size="42" font-weight="800">0</text>
      <text x="85" y="258" fill="${palette.white}" fill-opacity="0.70" font-size="24" font-weight="600">/ 28</text>
      <rect x="38" y="288" width="190" height="8" rx="4" fill="rgba(255,255,255,0.13)"/>
      <circle cx="256" cy="246" r="32" fill="rgba(255,177,43,0.10)" stroke="rgba(255,177,43,0.35)"/>
    ` })}
    <text x="18" y="374" fill="${palette.white}" font-size="21" font-weight="800">Locked Badges</text>
    <g opacity="0.9">
      ${badgeTile({ x: 24, y: 406, title: "Source Checker", progress: "0/20", desc: "Open source links" })}
      ${badgeTile({ x: 128, y: 406, title: "Committee Watcher", progress: "0/10", desc: "Track committee actions" })}
      ${badgeTile({ x: 232, y: 406, title: "Register to Vote", progress: "0/1", desc: "Complete a form" })}
      ${badgeTile({ x: 24, y: 584, title: "Super Voter", progress: "5/6", desc: "Log election participation" })}
      ${badgeTile({ x: 128, y: 584, title: "Constitution Champion", progress: "0/10", desc: "Civic learning actions" })}
      ${badgeTile({ x: 232, y: 584, title: "Policy Architect", progress: "0/5", desc: "Build policy actions" })}
    </g>
    ${bottomNav("Alerts")}
  `;

  return frame("badges-locked", content, [
    { number: 1, x: 248, y: 137, labelY: 96, text: "Filter tabs let testers switch between all, earned, and locked badges." },
    { number: 2, x: 76, y: 255, labelY: 210, text: "Overall badge progress should match the earned total and the badge count." },
    { number: 3, x: 265, y: 510, labelY: 334, text: "Locked badges now show a small progress pill like 0/20 or 5/6." },
    { number: 4, x: 268, y: 550, labelY: 474, text: "Requirement copy should match the badge name and real completion action." },
    { number: 5, x: 64, y: 688, labelY: 622, text: "Super Voter belongs to election participation and should count to six." }
  ]);
}

function badgeTile({ x, y, title, progress, desc }) {
  return `
    <polygon points="${x + 34},${y} ${x + 70},${y} ${x + 94},${y + 38} ${x + 70},${y + 76} ${x + 34},${y + 76} ${x + 10},${y + 38}" fill="rgba(148,163,184,0.42)" stroke="rgba(255,255,255,0.10)"/>
    ${textBlock({ text: title, x, y: y + 108, width: 13, size: 13.5, fill: palette.white, opacity: 0.62, weight: 800, lineHeight: 16 })}
    ${pill({ x: x + 20, y: y + 142, width: 56, height: 24, label: progress, tone: palette.white, size: 11 })}
    ${textBlock({ text: desc, x: x + 2, y: y + 184, width: 15, size: 10.5, fill: palette.white, opacity: 0.78, weight: 500, lineHeight: 13 })}
  `;
}

function actionLedger() {
  const content = `
    ${appHeader({ title: "Action Ledger", eyebrow: "Civic Engagement", back: true })}
    ${card({ x: 18, y: 128, width: 292, height: 104, title: "Civic action history", subtitle: "Prepared letters, confirmed sends, signed petitions, recipients, and issues.", accent: palette.brass })}
    ${card({ x: 18, y: 248, width: 292, height: 118, eyebrow: "Civic Action Ledger", title: "0 tracked actions", subtitle: "", accent: palette.brass, children: `
      ${miniMetric({ x: 35, y: 314, width: 76, label: "Letters", value: "0", tone: palette.green })}
      ${miniMetric({ x: 126, y: 314, width: 82, label: "Petitions", value: "0", tone: palette.purple })}
      ${miniMetric({ x: 223, y: 314, width: 70, label: "Latest", value: "-", tone: palette.blueSoft })}
    ` })}
    ${card({ x: 18, y: 382, width: 292, height: 142, title: "Recent Letters", subtitle: "", accent: palette.green, children: `
      ${pill({ x: 235, y: 398, width: 58, height: 26, label: "Find", tone: palette.brass, size: 11 })}
      <rect x="36" y="436" width="256" height="72" rx="14" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)"/>
      <text x="52" y="465" fill="${palette.white}" font-size="14" font-weight="700">No letters tracked yet</text>
      <text x="52" y="486" fill="${palette.white}" fill-opacity="0.54" font-size="11.5">Drafts and sent confirmations appear here.</text>
    ` })}
    ${card({ x: 18, y: 540, width: 292, height: 130, title: "Signed Petitions", subtitle: "", accent: palette.purple, children: `
      ${pill({ x: 222, y: 556, width: 70, height: 26, label: "Browse", tone: palette.purple, size: 11 })}
      <rect x="36" y="594" width="256" height="58" rx="14" fill="rgba(185,143,255,0.08)" stroke="rgba(185,143,255,0.2)"/>
      <text x="52" y="623" fill="${palette.white}" font-size="14" font-weight="700">No petitions signed yet</text>
      <text x="52" y="642" fill="${palette.white}" fill-opacity="0.54" font-size="11.5">Signed campaigns appear with date and issue.</text>
    ` })}
    ${bottomNav("Track")}
  `;

  return frame("action-ledger", content, [
    { number: 1, x: 76, y: 312, labelY: 104, text: "The summary card combines letters and petitions into total civic actions." },
    { number: 2, x: 262, y: 410, labelY: 230, text: "Find starts the representative flow that creates draft or sent letter records." },
    { number: 3, x: 96, y: 466, labelY: 360, text: "Recent Letters should preserve subject, recipient, status, and date." },
    { number: 4, x: 254, y: 568, labelY: 504, text: "Browse opens petitions, and signed campaigns return to this section." },
    { number: 5, x: 96, y: 623, labelY: 640, text: "Signed Petitions should appear under letters on the same ledger page." }
  ]);
}

function petitions() {
  const content = `
    ${appHeader({ title: "Civic Petitions", back: true })}
    ${card({ x: 18, y: 120, width: 292, height: 112, eyebrow: "Active Civic Actions", title: "Petitions", subtitle: "Signing records engagement and contributes to impact.", accent: palette.purple, children: `
      ${pill({ x: 222, y: 138, width: 70, height: 28, label: "Signed 0", tone: palette.purple, size: 11 })}
    ` })}
    ${petitionCard({ y: 252, title: "Support open government records", progress: "2,430 supporters", target: "5,000 goal" })}
    ${petitionCard({ y: 494, title: "Protect local election access", progress: "1,185 supporters", target: "2,500 goal" })}
    ${bottomNav("Alerts")}
  `;

  return frame("petitions", content, [
    { number: 1, x: 254, y: 152, labelY: 102, text: "Signed count should update after each unique petition is completed." },
    { number: 2, x: 70, y: 300, labelY: 222, text: "Petition cards should clearly explain the civic issue and action." },
    { number: 3, x: 166, y: 394, labelY: 350, text: "Campaign progress needs to look credible and easy to scan." },
    { number: 4, x: 96, y: 448, labelY: 486, text: "Sign Petition should disable after signing and update impact/badges." },
    { number: 5, x: 238, y: 448, labelY: 620, text: "View Badges gives testers a direct way to verify progress changed." }
  ]);
}

function petitionCard({ y, title, progress, target }) {
  return card({
    x: 18,
    y,
    width: 292,
    height: 214,
    title,
    subtitle: "Use this to test petition signing, duplicate prevention, and ledger updates.",
    accent: palette.purple,
    children: `
      <text x="38" y="${y + 124}" fill="${palette.white}" fill-opacity="0.58" font-size="11.5">${esc(progress)}</text>
      <text x="260" y="${y + 124}" text-anchor="end" fill="${palette.white}" fill-opacity="0.58" font-size="11.5">${esc(target)}</text>
      <rect x="38" y="${y + 136}" width="252" height="8" rx="4" fill="rgba(255,255,255,0.12)"/>
      <rect x="38" y="${y + 136}" width="138" height="8" rx="4" fill="${palette.purple}"/>
      <rect x="38" y="${y + 162}" width="120" height="36" rx="10" fill="rgba(185,143,255,0.14)" stroke="rgba(185,143,255,0.38)"/>
      <text x="98" y="${y + 185}" text-anchor="middle" fill="#d5b8ff" font-size="12" font-weight="800">Sign Petition</text>
      <rect x="170" y="${y + 162}" width="120" height="36" rx="10" fill="rgba(255,177,43,0.10)" stroke="rgba(255,255,255,0.12)"/>
      <text x="230" y="${y + 185}" text-anchor="middle" fill="${palette.brass}" font-size="12" font-weight="800">View Badges</text>
    `
  });
}

function search() {
  const content = `
    ${appHeader({ title: "Search", eyebrow: "Discovery", back: true })}
    ${card({ x: 18, y: 132, width: 292, height: 224, title: "Find civic records", subtitle: "", accent: palette.brass, children: `
      <rect x="38" y="184" width="252" height="42" rx="13" fill="rgba(255,255,255,0.055)" stroke="rgba(255,255,255,0.12)"/>
      <text x="55" y="211" fill="${palette.white}" fill-opacity="0.52" font-size="13">Search bills, officials, votes...</text>
      <rect x="38" y="242" width="252" height="42" rx="15" fill="rgba(255,255,255,0.055)" stroke="rgba(255,255,255,0.12)"/>
      <rect x="40" y="245" width="58" height="36" rx="12" fill="${palette.brass}"/>
      <text x="69" y="268" text-anchor="middle" fill="#061126" font-size="12" font-weight="800">All</text>
      <text x="126" y="268" fill="${palette.white}" fill-opacity="0.56" font-size="12" font-weight="700">Bills</text>
      <text x="180" y="268" fill="${palette.white}" fill-opacity="0.56" font-size="12" font-weight="700">Officials</text>
      <text x="247" y="268" fill="${palette.white}" fill-opacity="0.56" font-size="12" font-weight="700">Votes</text>
      <rect x="38" y="302" width="252" height="40" rx="13" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)"/>
      <text x="58" y="327" fill="${palette.brass}" font-size="12" font-weight="700">Refine results</text>
      <text x="226" y="327" fill="${palette.white}" fill-opacity="0.48" font-size="12">Pro</text>
    ` })}
    <g>
      ${miniMetric({ x: 18, y: 372, width: 88, label: "Records", value: "42", tone: palette.brass })}
      ${miniMetric({ x: 120, y: 372, width: 88, label: "Officials", value: "8", tone: palette.blueSoft })}
      ${miniMetric({ x: 222, y: 372, width: 88, label: "Bills", value: "21", tone: palette.green })}
    </g>
    ${card({ x: 18, y: 446, width: 292, height: 210, title: "Results", subtitle: "Bills, officials, and votes are grouped with source links.", accent: palette.blueSoft, children: `
      ${row({ x: 36, y: 500, width: 256, label: "H.R. 1234", meta: "Bill result - save to tracker", tone: palette.brass, tag: "Bill" })}
      ${row({ x: 36, y: 548, width: 256, label: "Rep. Sample", meta: "Official profile - contact flow", tone: palette.green, tag: "Official" })}
      ${row({ x: 36, y: 596, width: 256, label: "Roll Call 87", meta: "Vote record - review details", tone: palette.blueSoft, tag: "Vote" })}
    ` })}
    ${bottomNav("Track")}
  `;

  return frame("search", content, [
    { number: 1, x: 142, y: 205, labelY: 104, text: "Search input should return relevant bills, officials, and votes." },
    { number: 2, x: 70, y: 264, labelY: 224, text: "Type tabs must preserve filters and switch result categories cleanly." },
    { number: 3, x: 96, y: 322, labelY: 344, text: "Refine controls need to be understandable, especially for Pro-locked filters." },
    { number: 4, x: 74, y: 522, labelY: 482, text: "Result rows should link to detail pages and expose save/track paths." },
    { number: 5, x: 218, y: 570, labelY: 632, text: "Officials should lead into representative profiles and letter actions." }
  ]);
}

function account() {
  const content = `
    ${appHeader({ title: "Profile", eyebrow: "Account Center" })}
    ${card({ x: 18, y: 130, width: 292, height: 172, title: "Citizen Profile", subtitle: "Name, district, party, subscription, and synced status.", accent: palette.brass, children: `
      <circle cx="68" cy="206" r="30" fill="rgba(255,177,43,0.12)" stroke="${palette.brass}" stroke-opacity="0.54"/>
      <circle cx="88" cy="226" r="11" fill="${palette.green}" stroke="#061126" stroke-width="2"/>
      <text x="112" y="205" fill="${palette.white}" font-size="18" font-weight="800">Demo Citizen</text>
      <text x="112" y="229" fill="${palette.white}" fill-opacity="0.54" font-size="12">District setup and alert profile</text>
      ${miniMetric({ x: 38, y: 248, width: 76, label: "Score", value: "0", tone: palette.brass })}
      ${miniMetric({ x: 126, y: 248, width: 76, label: "Level", value: "1", tone: palette.brass })}
      ${miniMetric({ x: 214, y: 248, width: 76, label: "Badges", value: "0", tone: palette.brass })}
    ` })}
    ${card({ x: 18, y: 318, width: 292, height: 134, title: "Tracked civic watchlist", subtitle: "Saved officials, bills, alerts, and issue interests.", accent: palette.green, children: `
      ${miniMetric({ x: 38, y: 390, width: 76, label: "Officials", value: "0", tone: palette.green })}
      ${miniMetric({ x: 126, y: 390, width: 76, label: "Bills", value: "0", tone: palette.blueSoft })}
      ${miniMetric({ x: 214, y: 390, width: 76, label: "Alerts", value: "0", tone: palette.brass })}
    ` })}
    ${card({ x: 18, y: 468, width: 292, height: 142, title: "Account Settings", subtitle: "", accent: palette.brass, children: `
      ${row({ x: 36, y: 518, width: 256, label: "Notifications", meta: "Votes, district alerts, weekly brief", tone: palette.brass })}
      ${row({ x: 36, y: 566, width: 256, label: "Beta Testing", meta: "Checklist and feedback", tone: palette.blueSoft })}
    ` })}
    ${card({ x: 18, y: 626, width: 292, height: 68, title: "Privacy Protected", subtitle: "Data export and controls planned", accent: palette.green })}
    ${bottomNav("Profile")}
  `;

  return frame("account", content, [
    { number: 1, x: 78, y: 207, labelY: 100, text: "Profile identity should use the signed-in account name when available." },
    { number: 2, x: 166, y: 268, labelY: 220, text: "Account stats mirror gamification data from the rest of the app." },
    { number: 3, x: 84, y: 402, labelY: 354, text: "Saved Ledger summarizes the user's tracked civic watchlist." },
    { number: 4, x: 92, y: 532, labelY: 500, text: "Settings expose notification, district, privacy, beta, and sign-in controls." },
    { number: 5, x: 164, y: 660, labelY: 650, text: "Privacy copy should make testers feel clear about data handling." }
  ]);
}

const pages = [
  ["dashboard-annotated.svg", dashboard()],
  ["impact-annotated.svg", impact()],
  ["badges-locked-annotated.svg", badges()],
  ["action-ledger-annotated.svg", actionLedger()],
  ["petitions-annotated.svg", petitions()],
  ["search-annotated.svg", search()],
  ["account-annotated.svg", account()]
];

await mkdir(imageDir, { recursive: true });
await Promise.all(pages.map(([filename, svg]) => writeFile(join(imageDir, filename), svg)));

console.log(`Generated ${pages.length} annotated snapshots in ${imageDir}`);
