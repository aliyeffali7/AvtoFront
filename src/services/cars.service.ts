import api from '@/lib/axios'
import { CarBrand } from '@/types'

let cache: Promise<CarBrand[]> | null = null

// The brand/model list is global reference data that never changes during a
// session, so fetch it once and share it between every form and list.
export function getCarBrands(): Promise<CarBrand[]> {
  if (!cache) {
    cache = api.get<CarBrand[]>('/api/car-brands/').then(r => r.data).catch(err => {
      cache = null
      throw err
    })
  }
  return cache
}
