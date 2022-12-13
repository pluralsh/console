import { P, Spinner } from 'honorable'

export default function CommandExitStatus({ exitCode }) {
  if (!exitCode && exitCode !== 0) {
    return <Spinner size={16} />
  }

  return exitCode === 0
    ? <P color="text-success">✓ OK</P>
    : <P color="text-error">✗ Exit code: {exitCode}</P>
}
