import fs from "node:fs";

const src = fs.readFileSync("files/Vezora_Finance_UI.jsx", "utf8");
const lines = src.split(/\n/);
const kept = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (i < 4) continue;
  if (line.startsWith("const STYLES")) continue;
  if (line.startsWith("/* ======== preview wrapper")) break;
  kept.push(line);
}
let body = kept.join("\n").trimEnd();
if (!body.includes("export default function App") && !body.includes("export default App")) {
  body += "\n\nexport default App;\n";
}
fs.mkdirSync("src/ui", { recursive: true });
fs.writeFileSync("src/ui/VezoraApp.jsx", `'use client';\n\n${body}\n`);
console.log("wrote src/ui/VezoraApp.jsx", fs.statSync("src/ui/VezoraApp.jsx").size);
