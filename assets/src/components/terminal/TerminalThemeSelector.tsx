import { useContext, useState } from 'react'
import { Flex } from 'honorable'
import Fuse from 'fuse.js'

import {
  Input,
  ListBoxItem,
  MagnifyingGlassIcon,
  Select,
  SprayIcon,
} from '@pluralsh/design-system'

import { HeaderIconButton } from 'components/cluster/containers/ContainerShell'

import { normalizedThemes, themeNames } from './themes'
import TerminalThemeContext from './TerminalThemeContext'

const fuse = new Fuse(themeNames, { threshold: 0.25 })

function TerminalThemeSelector() {
  const [, setTerminalTheme] = useContext(TerminalThemeContext)
  const [search, setSearch] = useState('')
  const [, setOpen] = useState(false)
  const results = fuse.search(search).map(x => x.item)
  const displayedThemes = results.length ? results : themeNames

  return (
    <Select
      aria-label="theme-selector"
      placement="right"
      width="460px"
      onSelectionChange={t => setTerminalTheme(t)}
      onOpenChange={o => setOpen(o)}
      triggerButton={(
        <HeaderIconButton tooltipProps={{ label: 'Change theme' }}>
          <SprayIcon />
        </HeaderIconButton>
      )}
      dropdownFooterFixed={(
        <Flex
          width="458px"
          height="30px"
        >
          <Input
            small
            position="absolute"
            width="460px"
            margin="-1px"
            borderTopLeftRadius={0}
            borderTopRightRadius={0}
            startIcon={<MagnifyingGlassIcon />}
            placeholder="Filter themes"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Flex>
      )}
    >
      {displayedThemes.map(t => (
        <ListBoxItem
          key={t}
          label={t}
          textValue={t}
          leftContent={(
            <TerminalThemePreview
              theme={normalizedThemes[t]}
              marginRight="small"
            />
          )}
        />
      ))}
    </Select>
  )
}

function TerminalThemePreview({ theme, ...props }: any) {
  return (
    <Flex {...props}>
      {Object.entries(theme).map(([key, hex]) => (
        <div
          key={key}
          style={{
            width: 10,
            height: 10,
            backgroundColor: hex as any,
          }}
        />
      ))}
    </Flex>
  )
}

export default TerminalThemeSelector
