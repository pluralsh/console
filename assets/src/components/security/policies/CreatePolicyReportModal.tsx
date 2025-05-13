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
import streamSaver from 'streamsaver'

enum ReportFormat {
  CSV = 'csv',
}

const fetchPolicyReport = (format: ReportFormat, token: string) => {
  streamSaver.mitm = '/mitm.html'
  fetch(`/v1/compliance/report?format=${format}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => {
    const filename =
      res.headers
        ?.get('content-disposition')
        ?.split(';')
        ?.find((n) => n.includes('filename='))
        ?.replace('filename=', '')
        ?.trim() ?? 'report.zip'
    const writeStream = streamSaver.createWriteStream(filename)
    return res.body?.pipeTo(writeStream)
  })
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
