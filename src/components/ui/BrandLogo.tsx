import { useCarBrands } from '@/lib/useCarBrands'

// Always renders a fixed-size slot so plate numbers stay aligned even when the
// brand is free text that isn't in the list (no logo).
export default function BrandLogo({ brand, className = 'w-7 h-7' }: { brand: string; className?: string }) {
  const { findBrand } = useCarBrands()
  const logo = findBrand(brand)?.logo_url
  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      {logo && <img src={logo} alt={brand} loading="lazy" className="max-w-full max-h-full object-contain" />}
    </span>
  )
}
