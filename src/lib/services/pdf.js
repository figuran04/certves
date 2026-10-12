import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// NOTE: SF Pro is Apple's proprietary font. Embedding it into generated
// certificates (i.e. redistributing it) may violate Apple's font license.
// Consider swapping these files for an OFL-licensed equivalent (Inter, Noto
// Sans, ...) before distributing certificates in production.
const FONT_PATHS = {
  regular: '/fonts/SFProDisplay-Regular.ttf',
  semibold: '/fonts/SFProDisplay-Semibold.ttf',
  bold: '/fonts/SFProDisplay-Bold.ttf',
  italic: '/fonts/SFProDisplay-RegularItalic.ttf',
  semiboldItalic: '/fonts/SFProDisplay-SemiboldItalic.ttf',
  boldItalic: '/fonts/SFProDisplay-BoldItalic.ttf'
};

const fontBytesCache = new Map();
function loadFontBytes(url) {
  if (!fontBytesCache.has(url)) {
    fontBytesCache.set(
      url,
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((b) => new Uint8Array(b))
    );
  }
  return fontBytesCache.get(url);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 }
    : { r: 0, g: 0, b: 0 };
}

function measure(font, text, size) {
  try {
    return font.widthOfTextAtSize(text, size);
  } catch {
    return null;
  }
}

// pdf-lib standard (WinAnsi-only) fonts cannot encode arbitrary characters.
// When a value contains such characters, approximate it (strip accents,
// replace typographic punctuation) instead of letting generation throw.
function winAnsiSafe(str) {
  const replacements = {
    '\u2018': "'",
    '\u2019': "'",
    '\u201C': '"',
    '\u201D': '"',
    '\u2013': '-',
    '\u2014': '-',
    '\u2022': '*',
    '\u2026': '...',
    '\u00A0': ' '
  };
  const decomposed = String(str).normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const undefinedCp1252 = [0x81, 0x8d, 0x8f, 0x90, 0x9d];
  let out = '';
  for (const ch of decomposed) {
    if (replacements[ch] !== undefined) {
      out += replacements[ch];
      continue;
    }
    const code = ch.codePointAt(0);
    const printable =
      code === 0x09 ||
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0xa0 && code <= 0xff && !undefinedCp1252.includes(code));
    out += printable ? ch : '?';
  }
  return out;
}

export async function generateParticipantPDF(templateImages, fieldsArray, participant, mapping, pageSizes) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Standard fonts act as a fallback when custom font loading fails.
  const std = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    semibold: await doc.embedFont(StandardFonts.HelveticaBold),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    semiboldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique)
  };

  let custom = null;
  async function loadCustom() {
    if (custom !== null) return custom;
    const entries = Object.entries(FONT_PATHS);
    try {
      const byteArrays = await Promise.all(entries.map(([, path]) => loadFontBytes(path)));
      const fontMap = {};
      await Promise.all(
        byteArrays.map(async (bytes, i) => {
          fontMap[entries[i][0]] = await doc.embedFont(bytes, { subset: true });
        })
      );
      custom = fontMap;
    } catch {
      custom = std;
    }
    return custom;
  }

  async function getFont(weight, italic) {
    const f = await loadCustom();
    if (italic) {
      if (weight >= 700) return f.boldItalic;
      if (weight >= 600) return f.semiboldItalic ?? f.boldItalic;
      return f.italic;
    }
    if (weight >= 700) return f.bold;
    if (weight >= 600) return f.semibold ?? f.bold;
    return f.regular;
  }

  for (let i = 0; i < templateImages.length; i++) {
    const imgBytes = templateImages[i];
    const pageWidth = pageSizes?.[i]?.width ?? 842;
    const pageHeight = pageSizes?.[i]?.height ?? 595;
    const page = doc.addPage([pageWidth, pageHeight]);

    let image;
    if (imgBytes) {
      try {
        image = await doc.embedPng(imgBytes);
      } catch {
        image = await doc.embedJpg(imgBytes);
      }
    }

    if (image) {
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight
      });
    }

    const templateFields = fieldsArray[i] ?? [];
    for (const field of templateFields) {
      const columnName = mapping[field.key] ?? field.key;
      const value = participant[columnName] ?? participant[field.key] ?? '';

      if (value === '' && !field.showWhenEmpty) continue;

      const font = await getFont(field.fontWeight ?? 400, !!field.italic);
      const fontSize = field.fontSize ?? 24;
      let text = field.uppercase ? String(value).toUpperCase() : String(value);

      const x = (field.x / 100) * pageWidth;
      const y = pageHeight - (field.y / 100) * pageHeight;

      let textWidth = measure(font, text, fontSize);
      if (textWidth === null) {
        text = winAnsiSafe(text);
        textWidth = measure(font, text, fontSize) ?? 0;
      }

      let drawX = x;
      if (field.align === 'center') {
        drawX = x - textWidth / 2;
      } else if (field.align === 'right') {
        drawX = x - textWidth;
      }

      const color = hexToRgb(field.color ?? '#000000');
      const opacity = field.opacity == null ? 1 : Math.max(0, Math.min(1, Number(field.opacity)));
      const rotateDeg = Number(field.rotation) || 0;

      const drawY = y - fontSize;
      const options = {
        x: drawX,
        y: drawY,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity
      };

      if (rotateDeg) {
        // Rotate around the text's center to match the CSS transform-origin (center).
        // CSS uses clockwise-positive degrees; PDF uses counter-clockwise-positive.
        const centerX =
          field.align === 'right' ? x - textWidth / 2 : field.align === 'center' ? x : x + textWidth / 2;
        const centerY = y - fontSize / 2;
        const rad = (-rotateDeg * Math.PI) / 180;
        const dx = drawX - centerX;
        const dy = drawY - centerY;
        options.x = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
        options.y = centerY + dx * Math.sin(rad) + dy * Math.cos(rad);
        options.rotate = degrees(-rotateDeg);
      }

      try {
        page.drawText(text, options);
      } catch {
        try {
          page.drawText(winAnsiSafe(text), options);
        } catch {
          // Skip this field rather than failing the whole batch.
        }
      }
    }
  }

  return doc.save();
}

export async function generateAllPDFs(templateImages, fieldsArray, participants, mapping, pageSizes, onProgress) {
  const results = [];
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    const displayName = participant?.nama ?? participant?.name ?? participant?.Nama ?? `participant-${i + 1}`;
    onProgress?.(i, participants.length, displayName);

    await new Promise((r) => setTimeout(r, 0));

    const pdfBytes = await generateParticipantPDF(
      templateImages, fieldsArray, participant, mapping, pageSizes
    );
    results.push({ name: displayName, data: pdfBytes });
  }
  onProgress?.(participants.length, participants.length, 'Done');
  return results;
}