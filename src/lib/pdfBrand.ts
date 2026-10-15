import { Business } from '@/types'
import { formatPhone } from '@/lib/utils'
import { formatPlate } from '@/components/ui/Plate'

// Shared building blocks of the Servo-branded PDFs (service act, customer
// history): pdfmake access, brand fonts, colours, money/date formatting and the
// header / plate box / table cells / footer. Both documents are A4 portrait,
// ink on white, hairline rules, grey table heads, numbers right-aligned.

// pdfmake is loaded via CDN script tags in index.html to avoid Vite/Rollup
// corrupting the large base64 font data inside vfs_fonts.js during production build.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pm(): any { return (window as any).pdfMake }

export const INK = '#090909'
export const TEXT_2 = '#3D3D3D'
export const TEXT_3 = '#6B6B6B'
export const SURFACE_2 = '#EBEBEB'
export const BORDER = '#E0E0E0'
export const AZ_BLUE = '#1C4FA0'

export const SIDE = 45.35 // 16 mm
export const PAGE_WIDTH = 595.28 - SIDE * 2
export const PAGE_MARGINS = [SIDE, 45, SIDE, 62]

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']

const TEXT_FONT = 'SourceSans3'
const HEAD_FONT = 'LibreFranklin'
const MONO_FONT = 'JetBrainsMono'

const FONT_FILES: Record<string, string> = {
  'SourceSans3-Regular.ttf': '/fonts/SourceSans3-Regular.ttf',
  'SourceSans3-SemiBold.ttf': '/fonts/SourceSans3-SemiBold.ttf',
  'LibreFranklin-Bold.ttf': '/fonts/LibreFranklin-Bold.ttf',
  'JetBrainsMono-SemiBold.ttf': '/fonts/JetBrainsMono-SemiBold.ttf',
}

let fontsLoaded = false

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

const family = (file: string) => ({ normal: file, bold: file, italics: file, bolditalics: file })

// Registers the brand fonts (full Azerbaijani glyph coverage) in pdfmake.
// Returns false when they cannot be loaded; documents then fall back to Roboto.
async function ensureBrandFonts(): Promise<boolean> {
  if (fontsLoaded) return true
  try {
    const entries = await Promise.all(Object.entries(FONT_FILES).map(async ([name, url]) => [name, await fetchBase64(url)] as const))
    pm().addVirtualFileSystem(Object.fromEntries(entries))
    pm().fonts = {
      ...pm().fonts,
      [TEXT_FONT]: { normal: 'SourceSans3-Regular.ttf', bold: 'SourceSans3-SemiBold.ttf', italics: 'SourceSans3-Regular.ttf', bolditalics: 'SourceSans3-SemiBold.ttf' },
      [HEAD_FONT]: family('LibreFranklin-Bold.ttf'),
      [MONO_FONT]: family('JetBrainsMono-SemiBold.ttf'),
    }
    fontsLoaded = true
    return true
  } catch {
    return false
  }
}

// The Servo mark, cropped to its artwork, as an SVG string pdfmake can draw.
async function loadMark(): Promise<string> {
  try {
    const res = await fetch('/brand/servo_mark_ink_transparent.svg')
    if (!res.ok) return ''
    const svg = await res.text()
    return svg
      .replace(/width="\d+"/, 'width="224"')
      .replace(/height="\d+"/, 'height="192"')
      .replace(/viewBox="[^"]*"/, 'viewBox="56 56 224 192"')
  } catch {
    return ''
  }
}

export async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) return ''
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return ''
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

export interface BrandFonts {
  text: string
  head: string
  mono: string
}

export interface Brand {
  fonts: BrandFonts
  mark: string
}

// Fonts (registered once) + the Servo mark for the footer.
export async function loadBrand(): Promise<Brand> {
  const [ok, mark] = await Promise.all([ensureBrandFonts(), loadMark()])
  return {
    fonts: ok ? { text: TEXT_FONT, head: HEAD_FONT, mono: MONO_FONT } : { text: 'Roboto', head: 'Roboto', mono: 'Roboto' },
    mark,
  }
}

// 1250 → "1 250,00" (sign dropped; callers add "− " themselves).
export function money(n: number) {
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec}`
}

// 'YYYY-MM-DD' (a date) or a full ISO timestamp → local calendar parts.
function dateParts(value: string) {
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (plain) return { y: Number(plain[1]), m: Number(plain[2]), d: Number(plain[3]) }
  const dt = new Date(value)
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
}

export function longDate(value: string) {
  const { y, m, d } = dateParts(value)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// 16.10.2026
export function shortDate(value: string) {
  const { y, m, d } = dateParts(value)
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
}

// "Əli Məmmədov" → "Ali_Memmedov" for file names.
export function asciiSlug(text: string) {
  const map: Record<string, string> = { ə: 'e', Ə: 'E', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ü: 'u', Ü: 'U', ç: 'c', Ç: 'C', ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G' }
  return text
    .replace(/[əƏıİöÖüÜçÇşŞğĞ]/g, ch => map[ch])
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Small uppercase letter-spaced label.
export function label(text: string, extra = {}) {
  return { text, fontSize: 7, color: TEXT_3, characterSpacing: 1, margin: [0, 0, 0, 3], ...extra }
}

// Section title: "İŞLƏR", "SİFARİŞLƏR" …
export function sectionTitle(text: string, fonts: BrandFonts) {
  return { text, font: fonts.head, fontSize: 8.5, bold: true, color: INK, characterSpacing: 1.2, margin: [0, 18, 0, 6] }
}

// AZ licence plate box: ink border, blue "AZ" strip, mono number.
export function plateBox(plate: string, fonts: BrandFonts, margin = [0, 5, 0, 3]) {
  return {
    table: {
      body: [[
        { text: 'AZ', fontSize: 6.5, bold: true, color: '#FFFFFF', fillColor: AZ_BLUE, margin: [3, 3.5, 3, 0] },
        { text: formatPlate(plate), font: fonts.mono, fontSize: 10.5, color: INK, margin: [5, 1.5, 5, 0] },
      ]],
    },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => INK, vLineColor: () => INK, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 },
    margin,
  }
}

// Table cells: grey head cell, body cell, mono right-aligned number cell.
export function tableCells(fonts: BrandFonts) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const th = (text: string, alignment = 'left', extra = {}): any => ({ text, fontSize: 6.8, color: TEXT_3, characterSpacing: 0.9, alignment, fillColor: SURFACE_2, margin: [6, 5, 6, 4], ...extra })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const td = (text: unknown, alignment = 'left', extra = {}): any => ({ text, fontSize: 9.5, color: INK, alignment, margin: [6, 5, 6, 4], ...extra })
  const num = (text: string, extra = {}) => td(text, 'right', { font: fonts.mono, fontSize: 9, ...extra })
  return { th, td, num }
}

// 1px #E0E0E0 line under every body row (none above the grey head row).
export const rowsLayout = {
  hLineWidth: (i: number) => (i <= 1 ? 0 : 1),
  hLineColor: () => BORDER,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
}

export interface HeaderOptions {
  fonts: BrandFonts
  logo?: string
  shopName: string
  slogan?: string
  kind: string // "SERVİS AKTI", "MÜŞTƏRİ TARİXÇƏSİ"
  number?: string // shown as "№ <number>" when given
  date: string
}

// Business (logo, name, slogan) left; document label, number and date right;
// thin ink rule underneath.
export function buildHeader(o: HeaderOptions) {
  const { fonts, logo } = o
  return [
    {
      columns: [
        ...(logo ? [{ width: 52, image: logo, fit: [52, 52] }] : []),
        {
          width: '*',
          stack: [
            { text: o.shopName, font: fonts.head, fontSize: 20, bold: true, color: INK },
            o.slogan ? { text: o.slogan, fontSize: 9.5, color: TEXT_3, margin: [0, 3, 0, 0] } : null,
          ].filter(Boolean),
          margin: [logo ? 12 : 0, logo ? 6 : 0, 0, 0],
        },
        {
          width: 'auto',
          stack: [
            { text: o.kind, fontSize: 7.5, color: TEXT_3, characterSpacing: 1.6, alignment: 'right' },
            ...(o.number ? [{ text: `№ ${o.number}`, font: fonts.mono, fontSize: 17, bold: true, color: INK, alignment: 'right', margin: [0, 4, 0, 0] }] : []),
            { text: longDate(o.date), font: fonts.mono, fontSize: 8.5, color: TEXT_2, alignment: 'right', margin: [0, o.number ? 3 : 5, 0, 0] },
          ],
        },
      ],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: PAGE_WIDTH, y2: 0, lineWidth: 1, lineColor: INK }], margin: [0, 12, 0, 14] },
  ]
}

// Footer: contact line + "1 / 2" + Servo mark and "Servo ilə hazırlanıb".
export function buildFooter(brand: Brand, business?: Business | null) {
  const { fonts, mark } = brand
  const instagram = business?.instagram?.trim().replace(/^@/, '') ?? ''
  const contactLine = [business?.phone ? formatPhone(business.phone) : '', business?.address, instagram ? `@${instagram}` : ''].filter(Boolean).join(' · ')
  return (currentPage: number, pageCount: number) => ({
    margin: [SIDE, 14, SIDE, 0],
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: PAGE_WIDTH, y2: 0, lineWidth: 1, lineColor: BORDER }] },
      {
        columns: [
          { width: '*', text: contactLine, fontSize: 8, color: TEXT_3, margin: [0, 6, 0, 0] },
          ...(pageCount > 1 ? [{ width: 'auto', text: `${currentPage} / ${pageCount}`, font: fonts.mono, fontSize: 7.5, color: TEXT_3, margin: [0, 6, 14, 0] }] : []),
          ...(mark ? [{ width: 10, svg: mark, margin: [0, 5.5, 0, 0] }] : []),
          { width: 'auto', text: 'Servo ilə hazırlanıb', fontSize: 7.5, color: TEXT_3, margin: [mark ? 4 : 0, 6.5, 0, 0] },
        ],
      },
    ],
  })
}
