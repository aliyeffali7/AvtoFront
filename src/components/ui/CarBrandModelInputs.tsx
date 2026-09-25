import { useMemo } from 'react'
import { useCarBrands } from '@/lib/useCarBrands'
import ComboboxInput from './ComboboxInput'

// Marka və model: siyahıdan seçmək və ya siyahıda olmayanı sərbəst yazmaq olar.
// Model siyahısı seçilmiş markanın modelləri ilə məhdudlaşır.
export default function CarBrandModelInputs({ brand, model, onBrandChange, onModelChange }: {
  brand: string
  model: string
  onBrandChange: (v: string) => void
  onModelChange: (v: string) => void
}) {
  const { brands, findBrand } = useCarBrands()

  const brandNames = useMemo(() => brands.map(b => b.name), [brands])
  const logos = useMemo(() => Object.fromEntries(brands.map(b => [b.name, b.logo_url])), [brands])
  const modelOptions = findBrand(brand)?.models ?? []

  function handleBrand(v: string) {
    onBrandChange(v)
    const next = findBrand(v)
    if (next && model && !next.models.some(m => m.toLowerCase() === model.toLowerCase())) onModelChange('')
  }

  return (
    <>
      <ComboboxInput value={brand} onChange={handleBrand} options={brandNames} icons={logos} placeholder="Marka" wordStart />
      <ComboboxInput value={model} onChange={onModelChange} options={modelOptions} placeholder="Model" wordStart />
    </>
  )
}
