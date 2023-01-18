import { useMutation } from '@apollo/client'
import {
  Button,
  CheckIcon,
  CloseIcon,
  DropdownArrowIcon,
  ListBoxItem,
  ReloadIcon,
  Select,
} from '@pluralsh/design-system'
import { APPROVE_BUILD } from 'components/graphql/builds'
import { BuildStatus } from 'components/types'
import { Flex } from 'honorable'
import { useState } from 'react'

import BuildCancel from './BuildCancel'
import BuildRestart from './BuildRestart'

export default function BuildActions({ build }) {
  const [open, setOpen] = useState(false)
  const [cancel, setCancel] = useState(false)
  const [restart, setRestart] = useState(false)
  const [approveMutation, { loading }] = useMutation(APPROVE_BUILD,
    { variables: { id: build.id } })

  const menuItems = {
    approve: {
      label: <><CheckIcon />Approve build</>,
      hidden: !!build?.approver || build.status !== BuildStatus.PENDING,
      onSelect: () => approveMutation(),
    },
    cancel: {
      label: <><CloseIcon />Cancel build</>,
      hidden: build.status === BuildStatus.FAILED || build.status === BuildStatus.SUCCESSFUL,
      onSelect: () => setCancel(true),
    },
    restart: {
      label: <><ReloadIcon />Restart build</>,
      hidden: false,
      onSelect: () => setRestart(true),
    },
  }

  return (
    <Flex marginBottom="xsmall">
      <Select
        isOpen={open}
        label="Pick something"
        placement="right"
        width={200}
        onOpenChange={isOpen => setOpen(isOpen)}
        onSelectionChange={selectedKey => {
          setOpen(false)
          menuItems[selectedKey]?.onSelect()
        }}
        selectedKey={null}
        triggerButton={(
          <Button
            secondary
            fontWeight={600}
            endIcon={<DropdownArrowIcon />}
            width={200}
            disabled={loading}
            loading={loading}
          >
            Actions
          </Button>
        )}
      >
        {Object.entries(menuItems).filter(([, { hidden }]) => !hidden).map(([key, { label }]) => (
          <ListBoxItem
            key={key}
            textValue={key}
            label={(
              <Flex
                align="center"
                gap="small"
              >
                {label}
              </Flex>
            )}
          />
        ))}
      </Select>

      {/* Dialogs */}
      <BuildCancel
        build={build}
        open={cancel}
        setOpen={setCancel}
      />
      <BuildRestart
        build={build}
        open={restart}
        setOpen={setRestart}
      />
    </Flex>
  )
}
