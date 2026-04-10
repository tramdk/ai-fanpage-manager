const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir);
}

const appFile = path.join(srcDir, 'App.tsx');
let appContent = fs.readFileSync(appFile, 'utf8');

// We will extract everything between the component boundaries.
// The file is structured with markers or function definitions.
// Let's use regex to find components.
const components = [
  'StatusBadge',
  'DashboardView',
  'FanpageView',
  'AutomationView',
  'AIContentView',
  'HistoryView',
  'AdminView',
  'AuthView',
  'SettingsView'
];

let imports = `import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Facebook, FileText, Settings, Bell, Search, Menu, Plus,
  MoreVertical, CheckCircle2, XCircle, Clock, Activity, Bot, History, User,
  Upload, X, RefreshCw, Image as ImageIcon, Sliders, LogOut, CheckCircle, AlertCircle, Info, Sparkles
} from 'lucide-react';
import { Post, Schedule, Fanpage, Topic, MediaItem, AuthFetch } from '../types';\n\n`;

for (let i = 0; i < components.length; i++) {
  const comp = components[i];
  const nextComp = i < components.length - 1 ? components[i + 1] : 'export default function App';
  
  // Find start index
  const startRegex = new RegExp(`const ${comp}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*{`);
  const startMatch = appContent.match(startRegex);
  if (!startMatch) {
    console.error(`Could not find start of ${comp}`);
    continue;
  }
  const startIndex = startMatch.index;
  
  // Find end index (start of next component)
  let endIndex;
  if (nextComp === 'export default function App') {
    endIndex = appContent.indexOf('// --- MAIN APP ---');
    if (endIndex === -1) endIndex = appContent.indexOf('export default function App');
  } else {
    const nextStartRegex = new RegExp(`const ${nextComp}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*{`);
    const nextMatch = appContent.match(nextStartRegex);
    endIndex = nextMatch ? nextMatch.index : -1;
  }
  
  if (endIndex === -1) {
    console.error(`Could not find end of ${comp}`);
    continue;
  }
  
  // Extract component code
  // The component ends slightly before the next component starts, usually with `};\n`
  let compCode = appContent.substring(startIndex, endIndex).trim();
  
  // Clean up React imports inside the extracted code if any
  compCode = compCode.replace(/React\.useEffect/g, 'useEffect');
  
  // Determine necessary imports based on usage
  let compOut = imports + compCode + `\n\nexport default ${comp};\n`;
  
  // Replace `any` with types where obvious, or let the user do it later.
  // E.g., `fanpages: any[]` -> `fanpages: Fanpage[]`
  compOut = compOut.replace(/fanpages: any\[\]/g, 'fanpages: Fanpage[]');
  compOut = compOut.replace(/authFetch: any/g, 'authFetch: AuthFetch');
  compOut = compOut.replace(/authFetch: \(url: string, options\?: RequestInit\) => Promise<Response>/g, 'authFetch: AuthFetch');
  
  // Write to file
  fs.writeFileSync(path.join(componentsDir, `${comp}.tsx`), compOut);
  console.log(`Extracted ${comp}.tsx`);
}

// Now replace them in App.tsx
let newAppContent = appContent;
for (const comp of components) {
  const startRegex = new RegExp(`const ${comp}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*{`);
  const startMatch = appContent.match(startRegex);
  const startIndex = startMatch ? startMatch.index : -1;
  
  let endIndex;
  const nextComp = components[components.indexOf(comp) + 1] || 'export default function App';
  if (nextComp === 'export default function App') {
    endIndex = appContent.indexOf('// --- MAIN APP ---');
    if (endIndex === -1) endIndex = appContent.indexOf('export default function App');
  } else {
    const nextStartRegex = new RegExp(`const ${nextComp}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*{`);
    const nextMatch = appContent.match(nextStartRegex);
    endIndex = nextMatch ? nextMatch.index : -1;
  }
  
  if (startIndex !== -1 && endIndex !== -1) {
    const codeToRemove = appContent.substring(startIndex, endIndex);
    newAppContent = newAppContent.replace(codeToRemove, '');
  }
}

// Add imports for components
const importStatements = components.map(c => `import ${c} from './components/${c}';`).join('\n');
newAppContent = newAppContent.replace('// --- COMPONENTS ---', `// --- COMPONENTS ---\n${importStatements}\n`);

// Clean multiple newlines
newAppContent = newAppContent.replace(/\n{4,}/g, '\n\n');

// Replace any React.useEffect with useEffect in App.tsx
newAppContent = newAppContent.replace(/React\.useEffect/g, 'useEffect');

fs.writeFileSync(appFile, newAppContent);
console.log('Updated App.tsx successfully');
