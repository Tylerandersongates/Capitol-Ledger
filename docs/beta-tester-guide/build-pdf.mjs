import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const markdownPath = join(__dirname, "README.md");
const pdfPath = join(__dirname, "capitol-ledger-beta-tester-guide.pdf");

const page = { width: 612, height: 792, margin: 48 };
const contentWidth = page.width - page.margin * 2;
const colors = {
  navy: [0.027, 0.082, 0.184],
  blue: [0.09, 0.23, 0.44],
  brass: [1, 0.694, 0.169],
  body: [0.059, 0.09, 0.165],
  muted: [0.29, 0.36, 0.46],
  panel: [0.94, 0.965, 0.99],
  white: [1, 1, 1]
};

function escapePdfText(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function cleanInline(value) {
  return String(value).replace(/`([^`]+)`/g, "$1");
}

function rgb(color) {
  return color.map((part) => part.toFixed(3)).join(" ");
}

function estimateTextWidth(text, fontSize) {
  let total = 0;
  for (const char of text) {
    if (char === " ") total += 0.28;
    else if ("il.,:;!|'".includes(char)) total += 0.26;
    else if ("mwMW@#%&".includes(char)) total += 0.82;
    else if (/[A-Z0-9]/.test(char)) total += 0.62;
    else total += 0.52;
  }
  return total * fontSize;
}

function wrapText(text, fontSize, maxWidth) {
  const words = cleanInline(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || estimateTextWidth(next, fontSize) <= maxWidth) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function parseMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = null;
  let inCode = false;
  let codeLines = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    blocks.push(list);
    list = null;
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", lines: codeLines });
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "image", alt: imageMatch[1], src: imageMatch[2] });
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: `h${headingMatch[1].length}`, text: headingMatch[2] });
      continue;
    }

    const unorderedMatch = line.match(/^-\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { type: "list", ordered: false, items: [] };
      }
      list.items.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { type: "list", ordered: true, items: [] };
      }
      list.items.push(orderedMatch[1]);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return blocks;
}

function getJpegSize(bytes) {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7)
      };
    }
    offset += 2 + length;
  }
  throw new Error("Could not read JPEG dimensions");
}

class PdfLayout {
  constructor() {
    this.pages = [];
    this.ops = [];
    this.y = page.height - page.margin;
    this.images = new Map();
  }

  finishPage() {
    if (!this.ops.length) return;
    const pageNumber = this.pages.length + 1;
    this.drawLine(page.margin, 34, page.width - page.margin, 34, colors.panel, 0.8);
    this.drawText(`Capitol Ledger Beta Tester Guide  |  ${pageNumber}`, page.margin, 22, "F1", 8.5, colors.muted);
    this.pages.push({ ops: this.ops });
    this.ops = [];
    this.y = page.height - page.margin;
  }

  newPage() {
    this.finishPage();
  }

  ensure(height) {
    if (this.y - height < page.margin + 24) this.newPage();
  }

  drawText(text, x, y, font, size, color = colors.body) {
    this.ops.push(`BT ${rgb(color)} rg /${font} ${size.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(text)}) Tj ET`);
  }

  drawLine(x1, y1, x2, y2, color, width = 1) {
    this.ops.push(`${rgb(color)} RG ${width.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  fillRect(x, y, width, height, color) {
    this.ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
  }

  textBlock(text, { x = page.margin, size = 11.5, font = "F1", color = colors.body, width = contentWidth, leading = size * 1.35, gap = 8, firstLinePrefix = "" } = {}) {
    const lines = wrapText(text, size, width - estimateTextWidth(firstLinePrefix, size));
    this.ensure(lines.length * leading + gap);
    lines.forEach((line, index) => {
      const prefix = index === 0 ? firstLinePrefix : "";
      const lineX = index === 0 ? x : x + estimateTextWidth(firstLinePrefix, size);
      this.drawText(`${prefix}${line}`, lineX, this.y, font, size, color);
      this.y -= leading;
    });
    this.y -= gap;
  }

  heading(text, level) {
    const size = level === 1 ? 25 : level === 2 ? 16.5 : 13.5;
    const gapBefore = level === 1 ? 0 : level === 2 ? 18 : 12;
    const gapAfter = level === 1 ? 16 : 9;
    const lines = wrapText(text, size, contentWidth);
    this.ensure(gapBefore + lines.length * size * 1.18 + gapAfter + (level === 1 ? 14 : 0));
    this.y -= gapBefore;
    lines.forEach((line) => {
      this.drawText(line, page.margin, this.y, "F2", size, level === 3 ? colors.blue : colors.navy);
      this.y -= size * 1.18;
    });
    if (level === 1) {
      this.drawLine(page.margin, this.y + 4, page.width - page.margin, this.y + 4, colors.brass, 2.8);
      this.y -= 12;
    }
    this.y -= gapAfter;
  }

  list(items, ordered) {
    items.forEach((item, index) => {
      const marker = ordered ? `${index + 1}. ` : "- ";
      this.textBlock(item, {
        x: page.margin + 10,
        width: contentWidth - 10,
        firstLinePrefix: marker,
        gap: 3,
        leading: 14.5,
        size: 11.2
      });
    });
    this.y -= 5;
  }

  code(lines) {
    const fontSize = 9.5;
    const leading = 12;
    const wrapped = lines.flatMap((line) => wrapText(line || " ", fontSize, contentWidth - 28));
    const height = wrapped.length * leading + 24;
    this.ensure(height + 10);
    this.fillRect(page.margin, this.y - height + 8, contentWidth, height, colors.navy);
    let codeY = this.y - 11;
    wrapped.forEach((line) => {
      this.drawText(line, page.margin + 14, codeY, "F3", fontSize, colors.white);
      codeY -= leading;
    });
    this.y -= height + 10;
  }

  async image(alt, src) {
    const jpgSrc = src.replace(/\.png$/i, ".jpg");
    const imagePath = join(__dirname, jpgSrc);
    const bytes = await readFile(imagePath);
    const size = getJpegSize(bytes);
    let image = this.images.get(jpgSrc);
    if (!image) {
      image = { bytes, ...size, name: `Im${this.images.size + 1}` };
      this.images.set(jpgSrc, image);
    }

    const maxHeight = page.height - page.margin * 2 - 58;
    const scale = Math.min(contentWidth / image.width, maxHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const blockHeight = drawHeight + 25;
    this.ensure(blockHeight);
    const x = page.margin + (contentWidth - drawWidth) / 2;
    const y = this.y - drawHeight;
    this.ops.push(`q ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${image.name} Do Q`);
    this.y = y - 12;
    this.drawText(alt, page.margin + contentWidth / 2 - estimateTextWidth(alt, 9.2) / 2, this.y, "F2", 9.2, colors.muted);
    this.y -= 22;
  }
}

function pdfObject(id, body) {
  const prefix = Buffer.from(`${id} 0 obj\n`);
  const suffix = Buffer.from("\nendobj\n");
  return Buffer.concat([prefix, Buffer.isBuffer(body) ? body : Buffer.from(body), suffix]);
}

function streamObject(id, data, extra = "") {
  const compressed = deflateSync(Buffer.isBuffer(data) ? data : Buffer.from(data));
  return pdfObject(id, Buffer.concat([
    Buffer.from(`<< ${extra} /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`),
    compressed,
    Buffer.from("\nendstream")
  ]));
}

function imageObject(id, image) {
  return pdfObject(id, Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`),
    image.bytes,
    Buffer.from("\nendstream")
  ]));
}

async function main() {
  const markdown = await readFile(markdownPath, "utf8");
  const blocks = parseMarkdown(markdown);
  const layout = new PdfLayout();

  for (const block of blocks) {
    if (block.type === "h1") layout.heading(block.text, 1);
    else if (block.type === "h2") layout.heading(block.text, 2);
    else if (block.type === "h3") layout.heading(block.text, 3);
    else if (block.type === "paragraph") layout.textBlock(block.text);
    else if (block.type === "list") layout.list(block.items, block.ordered);
    else if (block.type === "code") layout.code(block.lines);
    else if (block.type === "image") await layout.image(block.alt, block.src);
  }

  layout.finishPage();

  let nextId = 1;
  const catalogId = nextId++;
  const pagesId = nextId++;
  const fontRegularId = nextId++;
  const fontBoldId = nextId++;
  const fontMonoId = nextId++;
  for (const image of layout.images.values()) image.id = nextId++;
  for (const pdfPage of layout.pages) {
    pdfPage.contentId = nextId++;
    pdfPage.id = nextId++;
  }

  const objects = [];
  objects.push(pdfObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`));
  objects.push(pdfObject(fontRegularId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  objects.push(pdfObject(fontBoldId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));
  objects.push(pdfObject(fontMonoId, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"));
  for (const image of layout.images.values()) objects.push(imageObject(image.id, image));
  for (const pdfPage of layout.pages) objects.push(streamObject(pdfPage.contentId, pdfPage.ops.join("\n")));

  const kids = layout.pages.map((pdfPage) => `${pdfPage.id} 0 R`).join(" ");
  objects.push(pdfObject(pagesId, `<< /Type /Pages /Kids [${kids}] /Count ${layout.pages.length} >>`));

  const imageResources = [...layout.images.values()].map((image) => `/${image.name} ${image.id} 0 R`).join(" ");
  for (const pdfPage of layout.pages) {
    objects.push(
      pdfObject(
        pdfPage.id,
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> /XObject << ${imageResources} >> >> /Contents ${pdfPage.contentId} 0 R >>`
      )
    );
  }

  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const chunks = [header];
  const offsets = [0];
  let offset = header.length;

  for (const object of objects.sort((left, right) => Number(String(left).match(/^(\d+)/)?.[1] ?? 0) - Number(String(right).match(/^(\d+)/)?.[1] ?? 0))) {
    offsets.push(offset);
    chunks.push(object);
    offset += object.length;
  }

  const xrefOffset = offset;
  const xrefLines = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
  for (let index = 1; index <= objects.length; index += 1) {
    xrefLines.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xrefLines.join("") + trailer));

  await writeFile(pdfPath, Buffer.concat(chunks));
  console.log(`Built ${pdfPath}`);
}

await main();
