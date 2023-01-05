import { useContext, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'react-apollo'

import {
  Button,
  Confirm,
  Copyable,
  ModalHeader,
  Scroller,
  Trash,
} from 'forge-core'

import {
  Box,
  FormField,
  Layer,
  Text,
  TextInput,
} from 'grommet'

import moment from 'moment'

import { chunk } from '../utils/array'

import {
  appendConnection,
  extendConnection,
  removeConnection,
  updateCache,
} from '../utils/graphql'

import { BreadcrumbsContext } from './Breadcrumbs'
import { CREATE_WEBHOOK, DELETE_WEBHOOK, WEBHOOKS_Q } from './graphql/webhooks'
import { BUILD_PADDING } from './builds/Builds'

import { LoopingLogo } from './utils/AnimatedLogo'
import { Container } from './utils/Container'
import { SectionContentContainer, SectionPortal } from './utils/Section'
import SmoothScroller from './utils/SmoothScroller'
import { HeaderItem } from './cluster/pods/Pod-old'
import { Icon } from './users/Group'

// const MAX_LEN = 100
// const trim = (url) => url.length > 10 ? `${url.slice(0, MAX_LEN)}...` : url

function WebhookHealth({ health }) {
  const background = health === 'HEALTHY' ? 'success' : 'error'

  return (
    <Box
      background={background}
      justify="center"
      align="center"
      round="xsmall"
      pad={{ horizontal: 'medium', vertical: 'xsmall' }}
    >
      <Text size="small">{health.toLowerCase()}</Text>
    </Box>
  )
}

function Webhook({ webhook: { url, health } }) {
  return (
    <Container width="50%">
      <Box fill="horizontal">
        <Copyable
          text={url}
          pillText="Webhook url copied"
        />
      </Box>
      <Box
        flex={false}
        gap="xsmall"
        direction="row"
        align="center"
      >
        <WebhookHealth health={health} />
      </Box>
    </Container>
  )
}

function WebhookForm({ onSubmit }) {
  const [attributes, setAttributes] = useState({ url: '' })
  const [mutation, { loading }] = useMutation(CREATE_WEBHOOK, {
    variables: { attributes },
    update: (cache, { data: { createWebhook } }) => updateCache(cache, {
      query: WEBHOOKS_Q,
      update: prev => appendConnection(prev, createWebhook, 'webhooks'),
    }),
    onCompleted: onSubmit,
  })

  return (
    <Box
      pad="medium"
      gap="small"
    >
      <FormField label="url">
        <TextInput
          placeholder="https://hooks.slack.com/services/..."
          value={attributes.url}
          onChange={({ target: { value } }) => setAttributes({ ...attributes, url: value })}
        />
      </FormField>
      <Box
        direction="row"
        align="center"
        justify="end"
      >
        <Button
          label="Create"
          onClick={mutation}
          loading={loading}
        />
      </Box>
    </Box>
  )
}

function CreateWebhook() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Box pad={{ horizontal: 'small' }}>
        <Button
          onClick={() => setOpen(true)}
          label="Create"
          flat
          background="brand"
          round="xsmall"
          pad={{ horizontal: 'medium', vertical: 'xsmall' }}
        />
      </Box>
      {open && (
        <Layer modal>
          <Box width="50vw">
            <ModalHeader
              text="Create webhook"
              setOpen={setOpen}
            />
            <WebhookForm onSubmit={() => setOpen(false)} />
          </Box>
        </Layer>
      )}
    </>
  )
}

const HEIGHT_PX = '45px'
const HEALTH_WIDTH = '150px'

function WebhookRow({
  hook: {
    id, url, health, insertedAt,
  },
}) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useMutation(DELETE_WEBHOOK, {
    variables: { id },
    update: (cache, { data: { deleteWebhook } }) => updateCache(cache, {
      query: WEBHOOKS_Q,
      update: prev => removeConnection(prev, deleteWebhook, 'webhooks'),
    }),
    onCompleted: () => setConfirm(false),
  })

  return (
    <>
      <Box
        flex={false}
        height={HEIGHT_PX}
        direction="row"
        align="center"
        border={{ side: 'bottom' }}
        pad="small"
        gap="small"
      >
        <Box
          fill="horizontal"
          gap="small"
          align="center"
          direction="row"
        >
          <Box
            width="70%"
            flex={false}
          >
            <Copyable
              text={url}
              pillText="Webhook url copied"
            />
          </Box>
          <HeaderItem
            text={moment(insertedAt).format('lll')}
            width="30%"
            nobold
          />
        </Box>
        <Box
          width={HEALTH_WIDTH}
          flex={false}
          direction="row"
          align="center"
          gap="small"
        >
          <WebhookHealth health={health} />
          <Icon
            icon={Trash}
            onClick={() => setConfirm(true)}
            iconAttrs={{ color: 'error' }}
            tooltip="Delete"
          />
        </Box>
      </Box>
      {confirm && (
        <Confirm
          description="This will permanently delete this webhook"
          loading={loading}
          cancel={() => setConfirm(false)}
          submit={mutation}
        />
      )}
    </>
  )
}

function WebhooksHeader() {
  return (
    <Box
      flex={false}
      height={HEIGHT_PX}
      direction="row"
      align="center"
      gap="small"
      border={{ side: 'bottom' }}
      pad={{ horizontal: 'small' }}
    >
      <Box
        fill="horizontal"
        direction="row"
        align="center"
        gap="small"
      >
        <HeaderItem
          width="70%"
          text="Url"
        />
        <HeaderItem
          width="30%"
          text="Created On"
        />
      </Box>
      <HeaderItem
        width={HEALTH_WIDTH}
        text="Health"
      />
    </Box>
  )
}

export function WebhookManagement() {
  const [listRef, setListRef] = useState(null)
  const { data, loading, fetchMore } = useQuery(WEBHOOKS_Q)

  if (!data) return <LoopingLogo scale="0.75" />
  const { edges, pageInfo } = data.webhooks

  return (
    <SectionContentContainer header="Webhooks">
      <WebhooksHeader />
      <Box fill>
        <SmoothScroller
          listRef={listRef}
          setListRef={setListRef}
          items={edges}
          mapper={({ node }) => <WebhookRow hook={node} />}
          loading={loading}
          loadNextPage={() => pageInfo.hasNextPage && fetchMore({
            variables: { cursor: pageInfo.endCursor },
            updateQuery: (prev, { fetchMoreResult: { webhooks } }) => extendConnection(prev, webhooks, 'webhooks'),
          })}
          hasNextPage={pageInfo.hasNextPage}
        />
      </Box>
      <SectionPortal>
        <CreateWebhook />
      </SectionPortal>
    </SectionContentContainer>
  )
}

export default function Webhooks() {
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([{ text: 'webhooks', url: '/webhooks' }]), [setBreadcrumbs])
  const { data, fetchMore } = useQuery(WEBHOOKS_Q)

  if (!data) {
    return (
      <LoopingLogo
        scale="0.75"
        dark
      />
    )
  }
  const { edges, pageInfo } = data.webhooks

  return (
    <Box
      fill
      background="backgroundColor"
    >
      <Box>
        <Box
          pad={{ vertical: 'small', ...BUILD_PADDING }}
          height="60px"
          direction="row"
          align="center"
          border={{ side: 'bottom' }}
        >
          <Box
            fill="horizontal"
            pad={{ horizontal: 'small' }}
          >
            <Text
              weight="bold"
              size="small"
            >Webhooks
            </Text>
            <Text
              size="small"
              color="dark-3"
            >will notify other tools of build success/failure
            </Text>
          </Box>
          <CreateWebhook />
        </Box>
        <Box
          height="calc(100vh - 105px)"
          pad={{ vertical: 'small', horizontal: 'medium' }}
        >
          <Scroller
            id="webhooks"
            style={{ height: '100%', overflow: 'auto' }}
            edges={Array.from(chunk(edges, 2))}
            mapper={chunk => (
              <Box
                key={chunk[0].node.id}
                direction="row"
                gap="small"
              >
                {chunk.map(({ node }) => (
                  <Webhook
                    key={node.id}
                    webhook={node}
                  />
                ))}
              </Box>
            )}
            onLoadMore={() => pageInfo.hasNextPage && fetchMore({
              variables: { cursor: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult: { webhooks } }) => ({
                ...prev,
                webhooks: {
                  ...prev.webhooks,
                  pageInfo: webhooks.pageInfo,
                  edges: [...prev.webhooks.edges, ...webhooks.edges],
                },
              }),
            })}
          />
        </Box>
      </Box>
    </Box>
  )
}
