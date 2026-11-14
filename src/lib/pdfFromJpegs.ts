// A PDF of page images, in order — one image per page, nothing else. Used to share a long Tafsir
// as one document (lib/shareImage.ts renderTafsirPages draws the pages). Written here rather than
// with a library: JPEG data goes into a PDF as it is (DCTDecode), so a PDF of images needs only its
// objects and cross-reference table. The pages' text is the images' (Arabic shaped by the WebView's
// own text engine, exactly as on the share card); it isn't selectable in the PDF.

export interface PdfPageImage {
  /** The JPEG file's bytes. */
  jpeg: Uint8Array;
  /** Its size in pixels. */
  width: number;
  height: number;
}

/** A page's width in points (1/72 inch): a phone-sized page, about 19 cm wide. */
const PAGE_WIDTH_PT = 540;

const encoder = new TextEncoder();

/** A PDF text string: UTF-16BE with its byte-order mark, in hex — so Arabic titles survive. */
export function pdfTextString(s: string): string {
  let hex = "FEFF";
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  return `<${hex}>`;
}

/** The bytes of a data URL ("data:image/jpeg;base64,…"). */
export function dataUrlBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The PDF: one page per image, each image filling its page at its own proportions. */
export function pdfFromJpegs(pages: readonly PdfPageImage[], meta: { title?: string; author?: string } = {}): Uint8Array {
  if (pages.length === 0) throw new Error("no pages");
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  // Objects: 1 catalog, 2 pages, 3 info, then per page: page, contents, image.
  const object = (n: number, body: () => void) => {
    offsets[n] = length;
    write(`${n} 0 obj\n`);
    body();
    write("\nendobj\n");
  };

  write("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const pageObj = (i: number) => 4 + i * 3;
  object(1, () => write("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () => write(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${pageObj(i)} 0 R`).join(" ")}] >>`));
  object(3, () => write(`<< /Producer (DITHAR)${meta.title ? ` /Title ${pdfTextString(meta.title)}` : ""}${meta.author ? ` /Author ${pdfTextString(meta.author)}` : ""} >>`));
  pages.forEach((page, i) => {
    const w = PAGE_WIDTH_PT;
    const h = Math.round((PAGE_WIDTH_PT * page.height) / page.width * 100) / 100;
    const n = pageObj(i);
    const draw = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    object(n, () => write(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`));
    object(n + 1, () => write(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
    object(n + 2, () => {
      write(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`);
      write(page.jpeg);
      write("\nendstream");
    });
  });

  const count = 4 + pages.length * 3;
  const xref = length;
  write(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) write(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  write(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** A PDF's bytes as a data URL. */
export function pdfDataUrl(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:application/pdf;base64,${btoa(bin)}`;
}
