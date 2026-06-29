import type { FileType } from '@/types'

export const fileTypes: FileType[] = [
  {
    id: 'word',
    label: 'Word Document',
    description: 'Word documents with text and metadata extracted.',
  },
  {
    id: 'excel',
    label: 'Excel Workbook',
    description: 'Excel files with cell values and formulas extracted.',
  },
  {
    id: 'pptx',
    label: 'PowerPoint',
    description: 'PowerPoint files with slide content extracted.',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: 'PDF files scanned as binary; embedded text may be detected.',
  },
  {
    id: 'zip',
    label: 'Zip Archive',
    description: 'ZIP archives with all internal files scanned.',
  },
  {
    id: 'jar',
    label: 'Java Archive',
    description: 'Java archives treated as ZIP files and fully scanned.',
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Image files scanned as binary and metadata.',
  },
  {
    id: 'csv',
    label: 'CSV',
    description: 'Delimited text scanned row by row.',
  },
  {
    id: 'text',
    label: 'Plain Text',
    description: 'Raw text files scanned line by line.',
  },
]

export const fileTypeById = (id: string) => fileTypes.find((f) => f.id === id)
