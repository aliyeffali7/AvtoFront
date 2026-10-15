import { ButtonHTMLAttributes, forwardRef } from 'react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** sm = 36px, md = 44px (default), lg = 52px (mechanic phone) */
  size?: Size
  loading?: boolean
  icon?: LucideIcon
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

const SIZE_CLASS: Record<Size, string> = {
  sm: '!min-h-[36px] !px-3 !text-small',
  md: '',
  lg: '!min-h-[52px] !px-5 !text-body-l',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon: Icon, disabled, className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        Icon && <Icon size={size === 'lg' ? 20 : 18} strokeWidth={1.75} className="shrink-0" />
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

export default Button
