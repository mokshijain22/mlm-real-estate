const fs = require('fs');
const path = require('path');
const Plot = require('../models/Plot');

const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'public', 'layouts');

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate a sample SVG layout for a project based on its plots.
 * Returns the relative path (e.g. "layouts/project_<id>_sample.svg").
 */
async function generate(project) {
  const plots = await Plot.find({ project: project._id });
  const totalPlots = plots.length;

  if (totalPlots === 0) {
    return generateEmptySvg(project);
  }

  const cols = Math.ceil(Math.sqrt(totalPlots));
  const rows = Math.ceil(totalPlots / cols);

  const plotWidth = 120;
  const plotHeight = 100;
  const gap = 20;
  const padding = 40;

  const svgWidth = cols * plotWidth + (cols - 1) * gap + padding * 2;
  const svgHeight = rows * plotHeight + (rows - 1) * gap + padding * 2 + 60;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `  <defs>\n`;
  svg += `    <style>\n`;
  svg += `      .plot { cursor: pointer; stroke: #fff; stroke-width: 2; transition: filter 0.2s; }\n`;
  svg += `      .plot:hover { filter: brightness(0.9); }\n`;
  svg += `      .plot-text { font-family: sans-serif; font-weight: bold; pointer-events: none; text-anchor: middle; fill: #1e293b; }\n`;
  svg += `      .plot-area { font-family: sans-serif; font-size: 10px; pointer-events: none; text-anchor: middle; fill: #64748b; }\n`;
  svg += `      .available { fill: #d1fae5; stroke: #10b981; }\n`;
  svg += `      .booked { fill: #fef3c7; stroke: #f59e0b; }\n`;
  svg += `      .sold { fill: #fee2e2; stroke: #ef4444; }\n`;
  svg += `    </style>\n`;
  svg += `  </defs>\n`;

  svg += `  <rect width="100%" height="100%" fill="#f8fafc" rx="12" />\n`;
  svg += `  <text x="${svgWidth / 2}" y="35" text-anchor="middle" style="font-family: sans-serif; font-weight: bold; font-size: 18px; fill: #334155;">${escapeHtml(
    project.name
  )} Site Layout</text>\n`;

  plots.forEach((plot, index) => {
    const r = Math.floor(index / cols);
    const c = index % cols;

    const x = padding + c * (plotWidth + gap);
    const y = padding + 60 + r * (plotHeight + gap);

    const statusClass = String(plot.status).toLowerCase();

    svg += `  <g class="plot-group" id="plot-group-${plot._id}" data-plot-id="${plot._id}" data-plot-number="${plot.plotNumber}">\n`;
    svg += `    <rect id="plot-${plot.plotNumber}" class="plot ${statusClass}" x="${x}" y="${y}" width="${plotWidth}" height="${plotHeight}" rx="8" />\n`;
    svg += `    <text x="${x + plotWidth / 2}" y="${y + plotHeight / 2 - 5}" class="plot-text">${escapeHtml(
      plot.plotNumber
    )}</text>\n`;
    svg += `    <text x="${x + plotWidth / 2}" y="${y + plotHeight / 2 + 15}" class="plot-area">${Number(
      plot.totalArea
    ).toLocaleString()} sqft</text>\n`;
    svg += `  </g>\n`;
  });

  svg += `</svg>`;

  ensureDir();
  const fileName = `layouts/project_${project._id}_sample.svg`;
  const filePath = path.join(STORAGE_DIR, `project_${project._id}_sample.svg`);

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  fs.writeFileSync(filePath, svg);

  return fileName;
}

function generateEmptySvg(project) {
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `  <rect width="100%" height="100%" fill="#f1f5f9" rx="8" />\n`;
  svg += `  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" style="font-family: sans-serif; fill: #64748b;">No plots added yet</text>\n`;
  svg += `</svg>`;

  ensureDir();
  const fileName = `layouts/${project._id}_empty.svg`;
  fs.writeFileSync(path.join(STORAGE_DIR, `${project._id}_empty.svg`), svg);

  return fileName;
}

/**
 * Check if the current layout is a system-generated sample.
 */
function isSample(pathStr) {
  if (!pathStr) return false;
  return pathStr.includes('_sample.svg') || pathStr.includes('_empty.svg');
}

/**
 * Regenerate the sample map only if it's currently a sample or missing.
 */
async function sync(project) {
  if (!project.layoutSvg || isSample(project.layoutSvg)) {
    const filePath = await generate(project);
    if (project.layoutSvg !== filePath) {
      project.layoutSvg = filePath;
      await project.save();
    }
  }
}

module.exports = { generate, isSample, sync };
