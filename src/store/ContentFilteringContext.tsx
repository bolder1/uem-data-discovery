import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DlpClassification, Label, Rule } from '@/types'
import {
  seedLabels,
  seedRuleDictionary,
  seedDefaultClassifications,
  seedCustomClassifications,
} from '@/data'

const CURRENT_USER = 'gautam'

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`

const nowIso = () => new Date().toISOString()

type NewClassification = Omit<
  DlpClassification,
  'id' | 'isDefault' | 'createdAt' | 'updatedAt'
>

type NewRule = Omit<Rule, 'id' | 'isDefault'>

interface ContextValue {
  currentUser: string
  labels: Label[]
  ruleDictionary: Rule[]
  defaultClassifications: DlpClassification[]
  customClassifications: DlpClassification[]
  addLabel: (name: string) => Label
  addClassification: (input: NewClassification) => DlpClassification
  updateClassification: (id: string, patch: Partial<NewClassification>) => void
  deleteClassification: (id: string) => void
  duplicateClassification: (id: string) => DlpClassification | undefined
  addRule: (input: NewRule) => Rule
  updateRule: (id: string, patch: Partial<NewRule>) => void
  deleteRule: (id: string) => void
  duplicateRule: (id: string) => Rule | undefined
}

const ContentFilteringContext = createContext<ContextValue | null>(null)

export function ContentFilteringProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Label[]>(seedLabels)
  const [ruleDictionary, setRuleDictionary] = useState<Rule[]>(seedRuleDictionary)
  const [defaultClassifications] = useState<DlpClassification[]>(
    seedDefaultClassifications,
  )
  const [customClassifications, setCustomClassifications] = useState<
    DlpClassification[]
  >(seedCustomClassifications)

  const addLabel = useCallback((name: string) => {
    const label: Label = { id: uid('lbl'), name: name.trim(), isDefault: false }
    setLabels((prev) => [...prev, label])
    return label
  }, [])

  const addClassification = useCallback((input: NewClassification) => {
    const classification: DlpClassification = {
      ...input,
      id: uid('cls'),
      isDefault: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    setCustomClassifications((prev) => [classification, ...prev])
    return classification
  }, [])

  const updateClassification = useCallback(
    (id: string, patch: Partial<NewClassification>) => {
      setCustomClassifications((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c,
        ),
      )
    },
    [],
  )

  const deleteClassification = useCallback((id: string) => {
    setCustomClassifications((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const duplicateClassification = useCallback(
    (id: string) => {
      const source =
        defaultClassifications.find((c) => c.id === id) ??
        customClassifications.find((c) => c.id === id)
      if (!source) return undefined
      const copy: DlpClassification = {
        ...source,
        id: uid('cls'),
        name: `${source.name} (copy)`,
        isDefault: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      setCustomClassifications((prev) => [copy, ...prev])
      return copy
    },
    [defaultClassifications, customClassifications],
  )

  const addRule = useCallback((input: NewRule) => {
    const rule: Rule = { ...input, id: uid('rule'), isDefault: false }
    setRuleDictionary((prev) => [rule, ...prev])
    return rule
  }, [])

  const updateRule = useCallback((id: string, patch: Partial<NewRule>) => {
    setRuleDictionary((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
  }, [])

  const deleteRule = useCallback((id: string) => {
    setRuleDictionary((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const duplicateRule = useCallback(
    (id: string) => {
      const source = ruleDictionary.find((r) => r.id === id)
      if (!source) return undefined
      const copy: Rule = {
        ...source,
        id: uid('rule'),
        name: `${source.name} (copy)`,
        isDefault: false,
      }
      setRuleDictionary((prev) => [copy, ...prev])
      return copy
    },
    [ruleDictionary],
  )

  const value = useMemo<ContextValue>(
    () => ({
      currentUser: CURRENT_USER,
      labels,
      ruleDictionary,
      defaultClassifications,
      customClassifications,
      addLabel,
      addClassification,
      updateClassification,
      deleteClassification,
      duplicateClassification,
      addRule,
      updateRule,
      deleteRule,
      duplicateRule,
    }),
    [
      labels,
      ruleDictionary,
      defaultClassifications,
      customClassifications,
      addLabel,
      addClassification,
      updateClassification,
      deleteClassification,
      duplicateClassification,
      addRule,
      updateRule,
      deleteRule,
      duplicateRule,
    ],
  )

  return (
    <ContentFilteringContext.Provider value={value}>
      {children}
    </ContentFilteringContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContentFiltering() {
  const ctx = useContext(ContentFilteringContext)
  if (!ctx)
    throw new Error(
      'useContentFiltering must be used within ContentFilteringProvider',
    )
  return ctx
}
