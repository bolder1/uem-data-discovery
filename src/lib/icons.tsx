import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileType2,
  FileArchive,
  Coffee,
  FileImage,
  Table,
  AlignLeft,
  UserRound,
  CreditCard,
  HeartPulse,
  Landmark,
  KeyRound,
  Code2,
  Lightbulb,
  Scale,
  type LucideIcon,
} from 'lucide-react'

export const fileTypeIcons: Record<string, LucideIcon> = {
  word: FileText,
  excel: FileSpreadsheet,
  pptx: Presentation,
  pdf: FileType2,
  zip: FileArchive,
  jar: Coffee,
  image: FileImage,
  csv: Table,
  text: AlignLeft,
}

export const fileTypeTint: Record<string, string> = {
  word: 'bg-blue-50 text-blue-600',
  excel: 'bg-emerald-50 text-emerald-600',
  pptx: 'bg-orange-50 text-orange-600',
  pdf: 'bg-red-50 text-red-600',
  zip: 'bg-amber-50 text-amber-600',
  jar: 'bg-amber-50 text-amber-700',
  image: 'bg-violet-50 text-violet-600',
  csv: 'bg-teal-50 text-teal-600',
  text: 'bg-slate-100 text-slate-600',
}

export const classificationIcons: Record<string, LucideIcon> = {
  pii: UserRound,
  pci: CreditCard,
  phi: HeartPulse,
  financial: Landmark,
  credentials: KeyRound,
  'source-code': Code2,
  ip: Lightbulb,
  legal: Scale,
}

export const classificationTint: Record<string, string> = {
  pii: 'bg-blue-50 text-blue-600',
  pci: 'bg-rose-50 text-rose-600',
  phi: 'bg-emerald-50 text-emerald-600',
  financial: 'bg-amber-50 text-amber-600',
  credentials: 'bg-violet-50 text-violet-600',
  'source-code': 'bg-cyan-50 text-cyan-600',
  ip: 'bg-fuchsia-50 text-fuchsia-600',
  legal: 'bg-slate-100 text-slate-600',
}

export const fileTypeIcon = (id: string): LucideIcon => fileTypeIcons[id] ?? FileText
export const classificationIcon = (id: string): LucideIcon =>
  classificationIcons[id] ?? FileText
