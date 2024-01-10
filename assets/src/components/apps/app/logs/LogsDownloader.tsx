import { Key, useState } from 'react'
import fileDownload from 'js-file-download'
import { fetchToken } from 'helpers/auth'
import {
  Button,
  DownloadIcon,
  FormField,
  IconFrame,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'

interface Duration {
  text: string
  value: number
}

const DURATIONS: Duration[] = [
  { text: '30m', value: 30 },
  { text: '1hr', value: 60 },
  { text: '2hr', value: 120 },
]

function downloadUrl(q, end, repo) {
  const url = `/v1/logs/${repo}/download`
  const params = Object.entries({ q, end })
    .map((kv) => kv.map(encodeURIComponent).join('='))
    .join('&')

  return `${url}?${params}`
}

async function download(url, name) {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${fetchToken()}` },
  })
  const blob = await resp.blob()

  fileDownload(blob, name)
}

export default function LogsDownloader({ query, repo }) {
  const [open, setOpen] = useState<boolean>(false)
  const [selectedKey, setSelectedKey] = useState<Key>(`${DURATIONS[0].value}`)

  return (
    <>
      <IconFrame
        icon={<DownloadIcon />}
        size="medium"
        tooltip
        tooltipProps={{ placement: 'bottom' }}
        clickable
        textValue="Download logs"
        type="secondary"
        onClick={() => setOpen(true)}
        css={{ width: 40, height: 40 }}
      />
      <Modal
        header="Download logs"
        open={open}
        onClose={() => setOpen(false)}
        actions={
          <>
            <Button
              secondary
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                download(
                  downloadUrl(query, selectedKey, repo),
                  `${repo}_logs.txt`
                )
                setOpen(false)
              }}
              marginLeft="medium"
            >
              Download
            </Button>
          </>
        }
      >
        <FormField label="Time frame">
          <Select
            aria-label="durations"
            selectedKey={selectedKey}
            onSelectionChange={setSelectedKey}
          >
            {DURATIONS.map(({ text, value }) => (
              <ListBoxItem
                key={`${value}`}
                textValue={`${value}`}
                label={text}
              />
            ))}
          </Select>
        </FormField>
      </Modal>
    </>
  )
}
