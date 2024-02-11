import { CheckIcon, ErrorIcon, Spinner, Tooltip } from '@pluralsh/design-system'

export default function CommandExitStatus({ exitCode }) {
  if (!exitCode && exitCode !== 0) {
    return <Spinner size={12} />
  }

  return exitCode === 0 ? (
    <CheckIcon
      color="icon-success"
      size={12}
    />
  ) : (
    <Tooltip
      label={`Exit code: ${exitCode}`}
      placement="bottom"
    >
      <ErrorIcon
        color="icon-error"
        cursor="help"
        size={12}
      />
    </Tooltip>
  )
}
