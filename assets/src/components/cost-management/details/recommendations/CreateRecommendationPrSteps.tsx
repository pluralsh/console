import { Button } from '@pluralsh/design-system'
import { MethodType } from './CreateRecommendationPrModal'

export function SelectPrTypeStep({
  type,
  setType,
}: {
  type: MethodType
  setType: (type: MethodType) => void
}) {
  return (
    <div>
      {type}
      <Button onClick={() => setType('pra')}>PR</Button>
      <Button onClick={() => setType('aiGen')}>AI</Button>
    </div>
  )
}

export function SelectPrAutomationStep() {
  return <div>SelectPrAutomationStep</div>
}

export function PreviewPrStep({ scalingRecId }: { scalingRecId: string }) {
  return <div>PreviewPrStep {scalingRecId}</div>
}
