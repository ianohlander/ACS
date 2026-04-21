import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "H:/My Drive/Repos/ACS/docs/assets";
mkdirSync(root, { recursive: true });

const palette = {
  ink: "#1c1f2a",
  muted: "#5d6376",
  panel: "#f7f2df",
  panel2: "#fff9e8",
  line: "#3c465c",
  blue: "#3f79c5",
  cyan: "#6ad2d8",
  green: "#61a65f",
  amber: "#d49a38",
  red: "#b85445",
  purple: "#7d69b4",
  dark: "#22283a",
  grid: "#d7ceb0",
};

const assets = [
  {
    file: "tutorial-relay-detail-00-chain.svg",
    title: "Relay Station Alecto - Trigger Chain",
    subtitle: "The quest is a staged system, not a single fetch loop.",
    kind: "flow",
    steps: [
      "AI contact sets ai_contacted",
      "Terminal restores auxiliary_power_online",
      "Transit pad changes tile and teleports",
      "Data core grants item and changes room state",
      "AI final report sets relay_restored",
    ],
    notes: ["Flags gate later triggers", "Quest stages keep the chain readable", "Tile changes make progress visible"],
  },
  {
    file: "tutorial-relay-detail-01-startup.svg",
    title: "Step 1 - Open The Editor",
    subtitle: "Run the web server, then start in editor.html.",
    kind: "browser",
    panels: ["npm run build", "npm run serve:web", "http://localhost:4317/editor.html"],
    notes: ["Use serve:api only when saving projects or publishing releases.", "The editor and runtime are separate pages that share adventure data."],
  },
  {
    file: "tutorial-relay-detail-03-map-links.svg",
    title: "Step 3 - Region Map Plan",
    subtitle: "Create a small station with clear map relationships.",
    kind: "maps",
    maps: [
      { name: "Access Ring", detail: "Start, AI, terminal, transit pad" },
      { name: "Data Core Chamber", detail: "Teleport target and reward" },
      { name: "Airlock Annex", detail: "Optional clue and safety path" },
    ],
    notes: ["Access Ring -> Data Core by triggered teleport", "Data Core -> Access Ring by normal exit", "Airlock Annex can be added as a conventional side map"],
  },
  {
    file: "tutorial-relay-detail-04-trigger-cells.svg",
    title: "Step 4 - Access Ring Trigger Cells",
    subtitle: "Paint first, then mark the cells that will later receive logic.",
    kind: "map",
    labels: [
      { x: 1, y: 1, text: "AI" },
      { x: 4, y: 2, text: "TERM" },
      { x: 7, y: 4, text: "PAD" },
      { x: 6, y: 6, text: "PANEL" },
    ],
    notes: ["AI cell starts the quest", "Terminal cell restores power", "Pad cell teleports only after power", "Panel cell changes when the core is recovered"],
  },
  {
    file: "tutorial-relay-detail-05-tiles.svg",
    title: "Step 5 - Tile Library Details",
    subtitle: "Choose tiles by job, not just by name.",
    kind: "library",
    columns: ["Tile", "Role", "Runtime Meaning"],
    rows: [
      ["Aux Terminal", "Power switch", "Trigger source"],
      ["Dormant Pad", "Tease route", "Visible but inactive"],
      ["Active Pad", "Travel gate", "Teleport trigger"],
      ["Core Plinth", "Reward site", "giveItem source"],
      ["Relay Panel", "World state", "changeTile target"],
    ],
  },
  {
    file: "tutorial-relay-detail-06-assets.svg",
    title: "Step 6 - Item And Pixel Asset Detail",
    subtitle: "Items and visual assets are separate, linked objects.",
    kind: "pixel",
    notes: ["Data Core item: inventory object", "Data Core sprite: visual presentation", "Access Cipher: optional gate item", "Relay Charge: optional power reward"],
  },
  {
    file: "tutorial-relay-detail-07-actors.svg",
    title: "Step 7 - Cast Placement",
    subtitle: "Place roles where their behavior teaches the player.",
    kind: "map",
    labels: [
      { x: 1, y: 1, text: "AI" },
      { x: 3, y: 2, text: "PLAYER" },
      { x: 6, y: 3, text: "DRONE" },
      { x: 7, y: 4, text: "PAD" },
    ],
    notes: ["The AI is near the start", "The drone guards the pad route", "Do not place enemies so they pin the player forever"],
  },
  {
    file: "tutorial-relay-detail-08-quest.svg",
    title: "Step 8 - Quest Object Detail",
    subtitle: "Use stages as authored checkpoints.",
    kind: "quest",
    steps: [
      "0: Establish contact",
      "1: Restore auxiliary power",
      "2: Activate transit pad",
      "3: Recover data core",
      "4: Report relay restored",
    ],
    notes: ["Every stage has a visible in-world reason.", "Avoid duplicate objectives by reusing the quest object."],
  },
  {
    file: "tutorial-relay-detail-09-dialogue-band.svg",
    title: "Step 9 - Classic Dialogue Band",
    subtitle: "Dialogue should appear in the play message area for classic mode.",
    kind: "dialogue",
    quote: "AI: Auxiliary power is below survival threshold. Restore the terminal, then use the transit pad.",
    notes: ["Use separate dialogue records for each station state.", "Debug mode may show the larger panel; classic mode uses the message band."],
  },
  {
    file: "tutorial-relay-detail-10-ai-trigger.svg",
    title: "Step 10 - AI Contact Trigger",
    subtitle: "First contact turns story into state.",
    kind: "trigger",
    when: "Interact with Station AI",
    ifs: ["quest stage >= 0"],
    thens: ["showDialogue(ai_first_contact)", "setFlag(ai_contacted = true)", "setQuestStage(relay = 1)"],
  },
  {
    file: "tutorial-relay-detail-11-power-payoff.svg",
    title: "Step 11 - Power Terminal Payoff",
    subtitle: "One terminal action changes story, inventory, map, and quest state.",
    kind: "trigger",
    when: "Enter or use Auxiliary Terminal",
    ifs: ["ai_contacted == true", "quest stage >= 1"],
    thens: ["showDialogue(power_restored)", "setFlag(auxiliary_power_online = true)", "giveItem(access_cipher)", "changeTile(dormant_pad -> active_pad)", "setQuestStage(relay = 2)"],
  },
  {
    file: "tutorial-relay-detail-12-teleport.svg",
    title: "Step 12 - Teleport Travel Model",
    subtitle: "Teleport is an authored action; exits are normal map links.",
    kind: "maps",
    maps: [
      { name: "Access Ring", detail: "Active transit pad at x7 y4" },
      { name: "Data Core Chamber", detail: "Arrival at x2 y2" },
    ],
    notes: ["Condition: auxiliary_power_online", "Action: teleport to Data Core Chamber", "Follow-up: set used_transit_pad and quest stage 3"],
  },
  {
    file: "tutorial-relay-detail-13-room-state.svg",
    title: "Step 13 - Data Core Room State",
    subtitle: "Recovering the core changes both the room and the earlier map.",
    kind: "map",
    labels: [
      { x: 2, y: 2, text: "ENTRY" },
      { x: 4, y: 3, text: "CORE" },
      { x: 4, y: 5, text: "PLINTH" },
      { x: 7, y: 6, text: "EXIT" },
    ],
    notes: ["giveItem(data_core)", "changeTile(core_plinth -> empty/restored)", "changeTile(access_ring_panel -> restored)", "setQuestStage(relay = 4)"],
  },
  {
    file: "tutorial-relay-detail-14-completion.svg",
    title: "Step 14 - Completion Trigger Detail",
    subtitle: "The AI recognizes the completed mission state.",
    kind: "trigger",
    when: "Interact with Station AI",
    ifs: ["hasItem(data_core) OR data_core_recovered", "quest stage >= 4"],
    thens: ["showDialogue(final_report)", "setFlag(relay_restored = true)", "setQuestStage(relay = completed)", "changeTile(relay_panel -> restored)"],
  },
  {
    file: "tutorial-relay-detail-15-exit.svg",
    title: "Step 15 - Safety Exit Detail",
    subtitle: "Use a normal exit as a reliable map-to-map fallback.",
    kind: "maps",
    maps: [
      { name: "Data Core Chamber", detail: "Exit tile at x7 y6" },
      { name: "Access Ring", detail: "Return tile near AI" },
    ],
    notes: ["Exit records are deterministic map links.", "Portal-looking tiles are presentation unless paired with runtime logic.", "Teleport actions are dramatic scripted movement."],
  },
  {
    file: "tutorial-relay-detail-16-scenarios.svg",
    title: "Step 16 - Playtest Scenarios",
    subtitle: "Diagnostics tell you what to test before publishing.",
    kind: "library",
    columns: ["Scenario", "What To Verify", "Likely Fix"],
    rows: [
      ["Start", "Player begins on Access Ring", "Check start map/id"],
      ["AI trigger", "Flag and quest stage advance", "Check trigger action ids"],
      ["Terminal", "Pad tile changes", "Check changeTile target"],
      ["Teleport", "Player arrives in core map", "Check map id and coordinates"],
      ["Completion", "relay_restored is set", "Check final conditions"],
    ],
  },
  {
    file: "tutorial-relay-detail-17-complete.svg",
    title: "Step 17 - Completed Play State",
    subtitle: "The player should see progress in state, inventory, and the map.",
    kind: "status",
    notes: ["Inventory includes Data Core", "Flags: ai_contacted, auxiliary_power_online, data_core_recovered, relay_restored", "Quest: Restore Relay Station Alecto completed", "Map shows active/restored tiles"],
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function text(x, y, value, size = 18, fill = palette.ink, weight = 500) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}">${escapeXml(value)}</text>`;
}

function wrapText(value, max = 42) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function paragraph(x, y, value, max = 44, size = 17, lineHeight = 24, fill = palette.ink) {
  return wrapText(value, max).map((line, index) => text(x, y + index * lineHeight, line, size, fill)).join("");
}

function base(asset, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="700" viewBox="0 0 1100 700" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(asset.title)}</title>
  <desc id="desc">${escapeXml(asset.subtitle)}</desc>
  <rect width="1100" height="700" fill="#efe4c8"/>
  <rect x="24" y="24" width="1052" height="652" rx="28" fill="${palette.panel}" stroke="${palette.line}" stroke-width="4"/>
  ${text(58, 76, asset.title, 34, palette.ink, 800)}
  ${text(60, 110, asset.subtitle, 18, palette.muted, 500)}
  ${body}
</svg>`;
}

function notes(asset, x = 700, y = 170) {
  if (!asset.notes?.length) return "";
  const rows = asset.notes.map((note, index) => {
    const top = y + index * 86;
    return `<rect x="${x}" y="${top - 34}" width="328" height="70" rx="14" fill="${palette.panel2}" stroke="${palette.grid}" stroke-width="2"/>
${text(x + 18, top - 6, `Note ${index + 1}`, 14, palette.amber, 800)}
${paragraph(x + 18, top + 20, note, 31, 15, 20, palette.ink)}`;
  });
  return rows.join("");
}

function flow(asset) {
  const rows = asset.steps.map((step, index) => {
    const x = 74 + index * 190;
    const color = [palette.blue, palette.amber, palette.purple, palette.green, palette.red][index % 5];
    return `<rect x="${x}" y="205" width="158" height="132" rx="18" fill="#fffdf3" stroke="${color}" stroke-width="4"/>
${text(x + 22, 244, `${index + 1}`, 30, color, 900)}
${paragraph(x + 22, 282, step, 14, 16, 21)}
${index < asset.steps.length - 1 ? `<path d="M ${x + 158} 270 L ${x + 188} 270" stroke="${palette.line}" stroke-width="4"/><path d="M ${x + 188} 270 l -12 -8 v 16 z" fill="${palette.line}"/>` : ""}`;
  });
  return rows.join("") + notes(asset, 80, 455);
}

function browser(asset) {
  const commands = asset.panels.map((command, index) => `<rect x="92" y="${180 + index * 72}" width="470" height="48" rx="8" fill="${index === 2 ? "#e8f4f7" : palette.dark}" stroke="${palette.line}"/>
${text(116, 211 + index * 72, command, 20, index === 2 ? palette.ink : "#f8f1dd", 700)}`).join("");
  return `<rect x="70" y="150" width="550" height="330" rx="18" fill="#fffdf3" stroke="${palette.line}" stroke-width="3"/>
${text(94, 166, "Terminal and browser route", 18, palette.muted, 700)}
${commands}
<rect x="92" y="410" width="470" height="42" rx="12" fill="${palette.green}" opacity="0.85"/>
${text(116, 438, "Editor opens to the progressive authoring flow", 18, "#ffffff", 800)}
${notes(asset, 670, 190)}`;
}

function maps(asset) {
  const mapCards = asset.maps.map((map, index) => {
    const x = 80 + index * 290;
    return `<rect x="${x}" y="190" width="240" height="150" rx="20" fill="#fffdf3" stroke="${[palette.blue, palette.green, palette.amber][index % 3]}" stroke-width="4"/>
${text(x + 22, 232, map.name, 22, palette.ink, 800)}
${paragraph(x + 22, 270, map.detail, 22, 16, 22, palette.muted)}
${index < asset.maps.length - 1 ? `<path d="M ${x + 240} 265 C ${x + 270} 235 ${x + 300} 235 ${x + 320} 265" fill="none" stroke="${palette.line}" stroke-width="4"/><path d="M ${x + 320} 265 l -12 -7 v 14 z" fill="${palette.line}"/>` : ""}`;
  });
  return mapCards.join("") + notes(asset, 110, 455);
}

function map(asset) {
  const cell = 52;
  let grid = `<rect x="80" y="155" width="${cell * 9}" height="${cell * 8}" fill="#253047" stroke="${palette.line}" stroke-width="4"/>`;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const wall = x === 0 || y === 0 || x === 8 || y === 7 || (x === 5 && y > 1 && y < 6);
      const fill = wall ? "#58606f" : "#d4c07d";
      grid += `<rect x="${80 + x * cell}" y="${155 + y * cell}" width="${cell - 2}" height="${cell - 2}" fill="${fill}" stroke="#30364a" stroke-width="1"/>`;
    }
  }
  const labels = asset.labels.map((label) => {
    const x = 80 + label.x * cell;
    const y = 155 + label.y * cell;
    return `<rect x="${x + 4}" y="${y + 12}" width="${cell - 10}" height="28" rx="8" fill="${palette.blue}" opacity="0.92"/>
${text(x + 9, y + 33, label.text, label.text.length > 5 ? 11 : 14, "#ffffff", 900)}`;
  });
  return grid + labels.join("") + notes(asset, 625, 185);
}

function library(asset) {
  let table = `<rect x="72" y="150" width="670" height="420" rx="18" fill="#fffdf3" stroke="${palette.line}" stroke-width="3"/>`;
  const widths = [190, 220, 230];
  let x = 95;
  asset.columns.forEach((column, index) => {
    table += text(x, 195, column, 18, palette.blue, 800);
    x += widths[index];
  });
  asset.rows.forEach((row, rowIndex) => {
    const y = 230 + rowIndex * 62;
    table += `<line x1="92" y1="${y - 22}" x2="710" y2="${y - 22}" stroke="${palette.grid}" stroke-width="2"/>`;
    let cellX = 95;
    row.forEach((value, index) => {
      table += paragraph(cellX, y, value, index === 0 ? 18 : 22, 15, 18, index === 0 ? palette.ink : palette.muted);
      cellX += widths[index];
    });
  });
  return table;
}

function pixel(asset) {
  let grid = `<rect x="92" y="160" width="320" height="320" rx="14" fill="#fdf8e6" stroke="${palette.line}" stroke-width="3"/>`;
  const pixels = [
    [3, 1], [4, 1], [2, 2], [5, 2], [1, 3], [6, 3], [2, 4], [5, 4], [3, 5], [4, 5], [2, 6], [5, 6],
  ];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const on = pixels.some(([px, py]) => px === x && py === y);
      grid += `<rect x="${116 + x * 34}" y="${184 + y * 34}" width="32" height="32" fill="${on ? palette.cyan : "#f4e9c8"}" stroke="${palette.grid}"/>`;
    }
  }
  grid += `<rect x="470" y="186" width="110" height="110" rx="10" fill="#253047" stroke="${palette.line}" stroke-width="3"/>
<rect x="508" y="205" width="34" height="34" fill="${palette.cyan}"/>
<rect x="492" y="240" width="68" height="34" fill="${palette.cyan}" opacity="0.75"/>
${text(474, 324, "Live small preview", 17, palette.muted, 700)}`;
  return grid + notes(asset, 650, 190);
}

function quest(asset) {
  return flow(asset);
}

function dialogue(asset) {
  return `<rect x="82" y="160" width="620" height="360" rx="20" fill="#1d2436" stroke="${palette.line}" stroke-width="4"/>
${text(110, 210, "Classic play message band", 24, "#f8e8b0", 800)}
<rect x="112" y="270" width="540" height="120" rx="12" fill="#101727" stroke="#6f7da0" stroke-width="2"/>
${paragraph(138, 318, asset.quote, 50, 20, 28, "#f7f0d5")}
${text(138, 438, "Use keyboard dialogue controls in classic play.", 17, "#9eb6d8", 700)}
${notes(asset, 740, 210)}`;
}

function trigger(asset) {
  const when = `<rect x="80" y="160" width="290" height="120" rx="16" fill="#fffdf3" stroke="${palette.blue}" stroke-width="4"/>
${text(106, 204, "WHEN", 18, palette.blue, 900)}
${paragraph(106, 238, asset.when, 26, 18, 24)}`;
  const ifs = asset.ifs.map((condition, index) => `<rect x="420" y="${150 + index * 78}" width="285" height="58" rx="14" fill="#fff7df" stroke="${palette.amber}" stroke-width="3"/>
${text(442, 186 + index * 78, condition, 16, palette.ink, 700)}`).join("");
  const thens = asset.thens.map((action, index) => `<rect x="750" y="${130 + index * 66}" width="275" height="48" rx="12" fill="#edf8ec" stroke="${palette.green}" stroke-width="3"/>
${text(770, 160 + index * 66, action, 14, palette.ink, 700)}`).join("");
  return when + text(428, 125, "IF", 18, palette.amber, 900) + ifs + text(758, 105, "THEN", 18, palette.green, 900) + thens;
}

function status(asset) {
  return `<rect x="85" y="150" width="455" height="380" rx="20" fill="#22283a" stroke="${palette.line}" stroke-width="4"/>
${text(118, 205, "Player Profile", 28, "#f8e8b0", 800)}
${text(122, 255, "Inventory: Data Core", 21, "#ffffff", 700)}
${text(122, 298, "Quest: Relay Restored", 21, "#ffffff", 700)}
${text(122, 341, "Power: Online", 21, "#7de0c5", 700)}
${text(122, 384, "Map: Restored Panel Visible", 21, "#7de0c5", 700)}
${text(122, 448, "Final AI dialogue appears in the message band.", 17, "#cad5f0", 600)}
${notes(asset, 620, 175)}`;
}

function render(asset) {
  const renderers = { flow, browser, maps, map, library, pixel, quest, dialogue, trigger, status };
  return base(asset, renderers[asset.kind](asset));
}

for (const asset of assets) {
  writeFileSync(join(root, asset.file), render(asset), "utf8");
}

console.log(`Generated ${assets.length} Relay tutorial detail assets.`);
