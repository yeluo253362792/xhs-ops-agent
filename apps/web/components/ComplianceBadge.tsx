import { ComplianceResult } from '@/lib/types'

interface Props {
  compliance: ComplianceResult
}

export default function ComplianceBadge({ compliance }: Props) {
  const config = {
    low: { label: '合规检测通过', className: 'bg-green-100 text-green-700' },
    medium: { label: '存在合规风险', className: 'bg-yellow-100 text-yellow-700' },
    high: { label: '高风险内容', className: 'bg-red-100 text-red-700' },
  }

  const { label, className } = config[compliance.level]

  return (
    <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </div>
  )
}
