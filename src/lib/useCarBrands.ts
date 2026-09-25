import { useEffect, useMemo, useState } from 'react'
import { CarBrand } from '@/types'
import { getCarBrands } from '@/services/cars.service'

export function useCarBrands() {
  const [brands, setBrands] = useState<CarBrand[]>([])

  useEffect(() => {
    getCarBrands().then(setBrands).catch(() => {})
  }, [])

  const byName = useMemo(() => new Map(brands.map(b => [b.name.toLowerCase(), b])), [brands])
  const findBrand = (name: string) => byName.get(name.trim().toLowerCase())

  return { brands, findBrand }
}
