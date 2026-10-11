import { use, useRef, useState } from 'react'

import {
  ArrowTopRightIcon,
  Button,
  DocumentIcon,
  GitHubLogoIcon,
  HelpIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { CommandPaletteContext } from 'components/commandpalette/CommandPaletteContext'
import { DocSearch } from './DocSearch'

import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { SidebarContext } from 'components/layout/Sidebar'
import { SidebarItem } from 'components/utils/sidebar/SidebarItem'
import { Link } from 'react-router-dom'
import { useTheme } from 'styled-components'

export function HelpLauncher() {
  const theme = useTheme()
  const { isExpanded } = use(SidebarContext)
  const { docsSearchOpen, setDocsSearchOpen } = use(CommandPaletteContext)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuBtnRef = useRef<HTMLDivElement>(null)
  useOutsideClick(menuBtnRef, () => setIsMenuOpen(false))

  return (
    <>
      <div
        ref={menuBtnRef}
        css={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {isExpanded ? (
          <SidebarItem
            type="button"
            expandedLabel="Help and docs"
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen((open) => !open)
            }}
            css={{ color: theme.colors['text-xlight'] }}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="Open help menu"
          >
            <HelpIcon color="icon-xlight" />
          </SidebarItem>
        ) : (
          <IconFrame
            clickable
            icon={<HelpIcon color="icon-xlight" />}
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen((open) => !open)
            }}
            tooltip={isMenuOpen ? undefined : 'Open help menu'}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="Open help menu"
          />
        )}
        <SimplePopupMenu
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          type="sidebar"
        >
          <Button
            small
            tertiary
            justifyContent="flex-start"
            as={Link}
            target="_blank"
            rel="noopener noreferrer"
            to="https://docs.plural.sh"
            onClick={() => setIsMenuOpen(false)}
            innerFlexProps={{ gap: 'xsmall' }}
          >
            <DocumentIcon />
            Docs
            <ArrowTopRightIcon size={12} />
          </Button>
          <Button
            small
            tertiary
            justifyContent="flex-start"
            as={Link}
            target="_blank"
            rel="noopener noreferrer"
            to="https://github.com/pluralsh"
            onClick={() => setIsMenuOpen(false)}
            innerFlexProps={{ gap: 'xsmall' }}
          >
            <GitHubLogoIcon />
            GitHub
            <ArrowTopRightIcon size={12} />
          </Button>
        </SimplePopupMenu>
      </div>
      <DocSearch
        isOpen={docsSearchOpen}
        onClose={() => setDocsSearchOpen(false)}
      />
    </>
  )
}
