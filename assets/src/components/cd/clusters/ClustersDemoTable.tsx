import { BrowseAppsIcon, Button, Card } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { MakeInert } from 'components/utils/MakeInert'
import { Body1BoldP, Body2P } from 'components/utils/typography/Text'
import { DOCS_CD_QUICKSTART_LINK } from 'utils/constants'

import { DEMO_CLUSTERS } from '../utils/demoData'

import { ClustersTable, TableWrapperSC } from './Clusters'

export function DemoTable({ mode }: { mode: 'disabled' | 'empty' }) {
  const tableData =
    mode === 'disabled' ? DEMO_CLUSTERS.slice(0, 4) : DEMO_CLUSTERS.slice(0, 3)

  return (
    <div
      css={{
        position: 'relative',
      }}
    >
      <MakeInert inert>
        <TableWrapperSC $blurred>
          <ClustersTable data={tableData} />
        </TableWrapperSC>
      </MakeInert>

      {mode === 'disabled' && (
        <OverlayCard
          title="Upgrade needed"
          actions={
            <Button
              primary
              as="a"
              href="https://app.plural.sh/account/billing"
              target="_blank"
              rel="noopener noreferrer"
            >
              Review plans
            </Button>
          }
        >
          Upgrade to Plural Professional to enable Continuous Deployment
          features.
        </OverlayCard>
      )}
      {mode === 'empty' && (
        <OverlayCard
          title="Create your first cluster to get started"
          actions={
            <>
              <Button
                primary
                as="a"
                href={DOCS_CD_QUICKSTART_LINK}
                target="_blank"
              >
                Guided deployment
              </Button>
              <Button
                secondary
                startIcon={<BrowseAppsIcon />}
                as={Link}
                to="/"
              >
                Explore the Console
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}
const OverlayCardSC = styled.div(({ theme }) => ({
  display: 'flex',
  position: 'absolute',
  alignItems: 'center',
  justifyContent: 'center',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  '.card': {
    padding: theme.spacing.xlarge,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.large,
    boxShadow: theme.boxShadows.modal,
    maxWidth: 460,
  },
  '.content': {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
  },
  '.body': {
    color: theme.colors['text-light'],
  },
  '.actions': { display: 'flex', gap: theme.spacing.medium },
}))

function OverlayCard({
  title,
  children,
  actions,
}: {
  title?: ReactNode
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <OverlayCardSC>
      <Card
        className="card"
        fillLevel={2}
      >
        {(title || children) && (
          <div className="content">
            {title && (
              <Body1BoldP
                as="h3"
                className="title"
              >
                {title}
              </Body1BoldP>
            )}
            {children && <Body2P className="body">{children}</Body2P>}
          </div>
        )}
        {actions && <div className="actions">{actions}</div>}
      </Card>
    </OverlayCardSC>
  )
}
