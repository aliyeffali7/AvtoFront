export default function Spinner({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className={`${className} border-4 border-rule border-t-accent rounded-full animate-spin`} />
    </div>
  )
}
