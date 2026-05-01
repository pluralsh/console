import {
  Button,
  Card,
  ClusterIcon,
  Divider,
  Flex,
  IconFrame,
  ListBoxItem,
  MoonIcon,
  Select,
  setThemeColorMode,
  SunIcon,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Homepage, useUpdateUserMutation } from 'generated/graphql'
import { ReactElement, useState } from 'react'
import { useTheme } from 'styled-components'

type ColorMode = 'light' | 'dark'

export function GlobalSettingsGeneral() {
  const { spacing, mode } = useTheme()
  const { me } = useLogin()
  const { popToast } = useSimpleToast()
  const savedHomepage = me?.homepage ?? Homepage.Clusters
  const savedThemeMode = mode

  const [homepage, setHomepage] = useState<Homepage>(savedHomepage)
  const [themeMode, setThemeMode] = useState<ColorMode>(savedThemeMode)

  const [mutation, { loading, error }] = useUpdateUserMutation({
    variables: { attributes: { homepage } },
    onCompleted: () =>
      popToast({
        content: 'Settings updated successfully',
        severity: 'success',
      }),
    refetchQueries: ['Me'],
    awaitRefetchQueries: true,
  })

  const changed = homepage !== savedHomepage || themeMode !== savedThemeMode

  const handleSave = async () => {
    if (homepage !== savedHomepage) await mutation()
    if (themeMode !== savedThemeMode) setThemeColorMode(themeMode)
  }

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {error && <GqlError error={error} />}
      <Card css={{ padding: spacing.large }}>
        <StretchedFlex>
          <StackedText
            first="Default home view"
            firstPartialType="body2Bold"
            firstColor="text"
            second="Select which default layout to display when launching your console"
          />
          <Select
            width={250}
            selectedKey={homepage}
            leftContent={homepageOptions[homepage].icon}
            onSelectionChange={(key) => setHomepage(key as Homepage)}
          >
            {Object.entries(homepageOptions).map(([key, { label, icon }]) => (
              <ListBoxItem
                key={key}
                leftContent={<IconFrame icon={icon} />}
                label={label}
              />
            ))}
          </Select>
        </StretchedFlex>
        <Divider
          backgroundColor="border-fill-two"
          css={{ margin: `${spacing.large}px 0` }}
        />
        <StretchedFlex>
          <StackedText
            first="Interface theme"
            firstPartialType="body2Bold"
            firstColor="text"
            second="Customize your interface color"
          />
          <Select
            selectedKey={themeMode}
            leftContent={themeOptions[themeMode].icon}
            onSelectionChange={(key) => setThemeMode(key as ColorMode)}
          >
            {Object.entries(themeOptions).map(([key, { label, icon }]) => (
              <ListBoxItem
                key={key}
                leftContent={<IconFrame icon={icon} />}
                label={label}
              />
            ))}
          </Select>
        </StretchedFlex>
      </Card>
      <Button
        disabled={!changed}
        loading={loading}
        onClick={handleSave}
        alignSelf="flex-end"
      >
        Save changes
      </Button>
    </Flex>
  )
}

const homepageOptions: Record<Homepage, { label: string; icon: ReactElement }> =
  {
    [Homepage.Workbenches]: {
      label: 'Workbench',
      icon: <WorkbenchIcon size={16} />,
    },
    [Homepage.Clusters]: {
      label: 'Clusters overview',
      icon: <ClusterIcon size={16} />,
    },
  }

const themeOptions: Record<ColorMode, { label: string; icon: ReactElement }> = {
  dark: { label: 'Dark', icon: <MoonIcon size={16} /> },
  light: { label: 'Light', icon: <SunIcon size={16} /> },
}
