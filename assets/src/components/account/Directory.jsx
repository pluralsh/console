import { useContext, useEffect, useState } from 'react'
import { Box, Text, ThemeContext } from 'grommet'
import { useMutation, useQuery } from '@apollo/client'
import {
  Button,
  InputCollection,
  Messages,
  ResponsiveInput,
  Webhooks,
} from 'forge-core'

import { useNavigate, useParams } from 'react-router-dom'

import { BreadcrumbsContext } from '../Breadcrumbs'

import { SectionContentContainer, SectionPortal } from '../utils/Section'

import { SIDEBAR_ICON_HEIGHT } from '../ConsoleSidebar'

import { WebhookManagement } from '../Webhooks'

import { SMTP_Q, UPDATE_SMTP } from '../graphql/plural'

import { LoginContext } from '../contexts'

const clean = smtp => {
  const { __typename, ...vals } = smtp || {}

  return vals
}

function SmtpSettingsInner({ smtp }) {
  const [form, setForm] = useState(clean(smtp))
  const [mutation, { loading }] = useMutation(UPDATE_SMTP, {
    variables: { smtp: form },
  })

  return (
    <SectionContentContainer header="SMTP Configuration">
      <Box pad="small">
        <InputCollection>
          <ResponsiveInput
            value={form.server || ''}
            placeholder="smtp.sendrid.net"
            label="server"
            onChange={({ target: { value } }) => setForm({ ...form, server: value })}
          />
          <ResponsiveInput
            value={form.port || ''}
            placeholder="587"
            label="port"
            onChange={({ target: { value } }) => setForm({ ...form, port: parseInt(value) })}
          />
          <ResponsiveInput
            value={form.sender || ''}
            placeholder="from address for outgoing emails"
            label="sender"
            onChange={({ target: { value } }) => setForm({ ...form, sender: value })}
          />
          <ResponsiveInput
            value={form.user || ''}
            placeholder="username for smtp authentication"
            label="user"
            onChange={({ target: { value } }) => setForm({ ...form, user: value })}
          />
          <ResponsiveInput
            value={form.password || ''}
            type="password"
            placeholder="password for smtp authentication"
            label="password"
            onChange={({ target: { value } }) => setForm({ ...form, password: value })}
          />
        </InputCollection>
      </Box>
      <SectionPortal>
        <Button
          loading={loading}
          onClick={mutation}
          flex={false}
          label="Update"
        />
      </SectionPortal>
    </SectionContentContainer>
  )
}

function SmtpSettings() {
  const { data } = useQuery(SMTP_Q)

  if (!data) return null

  return <SmtpSettingsInner smtp={data.smtp} />
}

function SectionChoice({
  label, icon, section, onClick, setSection,
}) {
  const { section: selected } = useParams()

  return (
    <Box
      focusIndicator={false}
      hoverIndicator="sidebarHover"
      direction="row"
      align="center"
      gap="small"
      pad="small"
      round="3px"
      height={SIDEBAR_ICON_HEIGHT}
      background={section === selected ? 'sidebarHover' : null}
      onClick={onClick || (() => setSection(section))}
    >
      {icon}
      <Text size="small">{label}</Text>
    </Box>
  )
}

export default function Directory() {
  let { section } = useParams()
  const { me, configuration: conf } = useContext(LoginContext)

  section = section || 'users'
  const navigate = useNavigate()
  const setSection = section => navigate(`/directory/${section}`)
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'directory', url: '/directory' },
      { text: section, url: `/directory/${section}` },
    ])
  }, [section])

  return (
    <ThemeContext.Extend value={{ global: { input: { padding: '8px' } } }}>
      <Box
        fill
        direction="row"
        gap="medium"
        background="backgroundColor"
      >
        <Box
          pad="small"
          gap="xsmall"
          flex={false}
          width="200px"
        >
          {me.roles?.admin && (
            <SectionChoice
              icon={<Messages size="14px" />}
              label="Email Settings"
              section="smtp"
              setSection={setSection}
            />
          )}
          <SectionChoice
            icon={<Webhooks size="14px" />}
            label="Webhooks"
            section="webhooks"
            setSection={setSection}
          />
        </Box>
        <Box
          background="white"
          elevation="small"
          fill
        >
          {section === 'webhooks' && <WebhookManagement />}
          {section === 'smtp' && conf.gitStatus.cloned && <SmtpSettings />}
        </Box>
      </Box>
    </ThemeContext.Extend>
  )
}
