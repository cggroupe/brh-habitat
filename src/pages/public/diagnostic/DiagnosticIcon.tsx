import { Droplets, Home, Square, Thermometer, Wind, Wrench, Zap } from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Droplets,
  Thermometer,
  Wind,
  Square,
  Zap,
  Home,
  Wrench,
}

interface DiagnosticIconProps {
  name: string
  size?: number
  className?: string
}

export function DiagnosticIcon({ name, size = 28, className }: DiagnosticIconProps) {
  const Icon = ICON_MAP[name] ?? Home
  return <Icon size={size} className={className} />
}
