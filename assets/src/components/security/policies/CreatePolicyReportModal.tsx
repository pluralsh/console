import {
  Button,
  FormField,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import { useCallback, useState } from 'react'
import { useTheme } from 'styled-components'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { fetchToken } from '../../../helpers/auth.ts'

enum ReportFormat {
  CSV = 'csv',
}

const fetchPolicyReport = async (format: ReportFormat, token: string) => {
  const response = await fetch(`/v1/compliance/report?format=${format}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch products pdf - ${response.statusText}`) // TODO
  }

  const blob: Blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link: HTMLAnchorElement = document.createElement('a')
  link.href = objectUrl
  link.download = `report.zip`
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export function CreatePolicyReportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const token = fetchToken()
  const [reportFormat, setReportFormat] = useState(ReportFormat.CSV)

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()
      fetchPolicyReport(reportFormat, token)
    },
    [reportFormat, token]
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      asForm
      onSubmit={onSubmit}
      header="Create policy report"
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.small,
          }}
        >
          <Button
            primary
            type="submit"
          >
            Create policy report
          </Button>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <FormField
        label="Report format"
        required
      >
        <Select
          selectedKey={reportFormat}
          onSelectionChange={(key) => setReportFormat(key as ReportFormat)}
        >
          {Object.entries(ReportFormat).map(([k, v]) => (
            <ListBoxItem
              key={v}
              label={k}
            />
          ))}
        </Select>
      </FormField>
    </Modal>
  )
}

export function CreatePolicyReportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        flexGrow={1}
        onClick={() => setOpen(true)}
      >
        Create report
      </Button>
      <ModalMountTransition open={open}>
        <CreatePolicyReportModal
          open={open}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
