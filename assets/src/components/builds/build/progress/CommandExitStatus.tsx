import { Spinner } from '@pluralsh/design-system'
import { P } from 'honorable'

export default function CommandExitStatus({ exitCode }) {
  if (!exitCode && exitCode !== 0) {
    return <Spinner size={12} />
  }

  return exitCode === 0 ? (
    <P
      color="text-success"
      whiteSpace="pre"
    >
      ✓ OK
    </P>
  ) : (
    <P
      color="text-error"
      whiteSpace="pre"
    >
      ✗ Exit code: {exitCode}
    </P>
  )
}
