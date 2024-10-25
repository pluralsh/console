import { ReactNode } from 'react'
import { AISuggestFixButton } from './AISuggestFixButton.tsx'

interface AISuggestFixProps {
  insightID: string
}

function AISuggestFix({ insightID }: AISuggestFixProps): ReactNode {
  console.log(insightID)

  return <AISuggestFixButton onClick={() => console.log('hello')} />
}

export { AISuggestFix }
