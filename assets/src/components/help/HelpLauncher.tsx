import { use, useRef, useState } from 'react'

import {
  ArrowTopRightIcon,
  Button,
  Divider,
  DocumentIcon,
  GitHubLogoIcon,
  HelpIcon,
  IconFrame,
  SearchDocsIcon,
} from '@pluralsh/design-system'
import { CommandPaletteContext } from 'components/commandpalette/CommandPaletteContext'
import CommandPaletteShortcuts from 'components/commandpalette/CommandPaletteShortcuts'
import { DocSearch } from './DocSearch'

import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { SidebarContext } from 'components/layout/Sidebar'
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
        css={{ position: 'relative' }}
      >
        {isExpanded ? (
          <Button
            small
            tertiary
            justifyContent="flex-start"
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen((open) => !open)
            }}
            css={{
              width: '100%',
              fontWeight: 'normal',
              '&&, &&:hover, &&:active, &&:focus-visible': {
                color: theme.colors['text-xlight'],
              },
            }}
            innerFlexProps={{ gap: 'xsmall' }}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="Open help menu"
          >
            <HelpIcon color="icon-xlight" />
            <span>Help and docs</span>
          </Button>
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
            endIcon={<CommandPaletteShortcuts shortcuts={['shift D']} />}
            onClick={() => {
              setIsMenuOpen(false)
              setDocsSearchOpen(true)
            }}
            innerFlexProps={{ gap: 'xsmall' }}
          >
            <SearchDocsIcon />
            <span>Search docs</span>
          </Button>
          <Divider
            backgroundColor="border-fill-two"
            css={{
              padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
            }}
          />
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
