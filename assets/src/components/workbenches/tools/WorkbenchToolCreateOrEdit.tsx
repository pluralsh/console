import { Flex, IconFrame, useSetBreadcrumbs } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import {
  Provider,
  useCreateWorkbenchToolMutation,
  useUpdateWorkbenchToolMutation,
  useWorkbenchToolQuery,
  WorkbenchToolAttributes,
  WorkbenchToolType,
} from 'generated/graphql'
import { capitalize, isEmpty } from 'lodash'
import { useLayoutEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  getWorkbenchToolEditAbsPath,
  WORKBENCHES_TOOLS_ADD_ABS_PATH,
  WORKBENCHES_TOOLS_ADD_REL_PATH,
  WORKBENCHES_TOOLS_PARAM_ID,
  WORKBENCHES_TOOLS_YOUR_REL_PATH,
  WORKBENCHES_TOOLS_YOUR_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { deepOmitBlank } from 'utils/graphql'
import { getWorkbenchesBreadcrumbs } from '../Workbenches'
import { WorkbenchToolForm, WorkbenchToolFormState } from './WorkbenchToolForm'
import {
  CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY,
  isConfigurableWorkbenchToolType,
  isProvider,
  PROVIDER_TO_LABEL,
  TOOL_TYPE_TO_LABEL,
  WorkbenchToolIcon,
} from './workbenchToolsUtils'

export const WORKBENCHES_TOOLS_TYPE_PARAM = 'type'
export const WORKBENCHES_TOOLS_PROVIDER_PARAM = 'provider'

function getBreadcrumbs(
  mode: 'create' | 'edit',
  toolId: string | undefined,
  tool: { id: string; name: string } | null | undefined
) {
  const crumbs = [
    ...getWorkbenchesBreadcrumbs(
      mode === 'create'
        ? WORKBENCHES_TOOLS_ADD_REL_PATH
        : WORKBENCHES_TOOLS_YOUR_REL_PATH
    ),
  ]

  if (mode === 'edit') {
    const label = tool?.name?.trim() || tool?.id || toolId
    if (label)
      crumbs.push({
        label,
        url: getWorkbenchToolEditAbsPath(toolId ?? tool?.id),
      })
  }

  crumbs.push({ label: mode, url: '' })
  return crumbs
}

export function WorkbenchToolCreateOrEdit({
  mode,
}: {
  mode: 'create' | 'edit'
}) {
  const navigate = useNavigate()
  const id = useParams()[WORKBENCHES_TOOLS_PARAM_ID]
  const [searchParams, setSearchParams] = useSearchParams()
  const providerParam = searchParams.get(WORKBENCHES_TOOLS_PROVIDER_PARAM)

  const { data, loading, error } = useWorkbenchToolQuery({
    variables: { id },
    skip: mode === 'create' || !id,
    fetchPolicy: 'network-only',
  })

  const tool = data?.workbenchTool
  const isLoading = !tool && loading

  useSetBreadcrumbs(
    useMemo(() => getBreadcrumbs(mode, id, tool), [mode, id, tool])
  )
  const type = (searchParams.get(WORKBENCHES_TOOLS_TYPE_PARAM) ??
    '') as WorkbenchToolType // the effect below ensures this type is valid
  const provider =
    type === WorkbenchToolType.Cloud && isProvider(providerParam)
      ? providerParam
      : null

  useLayoutEffect(() => {
    if (isLoading) return

    const nextType =
      tool?.tool ??
      (isConfigurableWorkbenchToolType(type) || type === WorkbenchToolType.Cloud
        ? type
        : WorkbenchToolType.Http)
    const nextProvider =
      tool?.cloudConnection?.provider ??
      (isProvider(providerParam) ? providerParam : Provider.Aws)

    if (nextType !== type || nextProvider !== providerParam) {
      const next: Record<string, string> = {
        [WORKBENCHES_TOOLS_TYPE_PARAM]: nextType,
      }
      if (nextProvider && nextType === WorkbenchToolType.Cloud)
        next[WORKBENCHES_TOOLS_PROVIDER_PARAM] = nextProvider
      setSearchParams(next, { replace: true })
    }
  }, [id, searchParams, setSearchParams, tool, isLoading, providerParam, type])

  const { popToast } = useSimpleToast()

  const [create, { loading: createLoading, error: createError }] =
    useCreateWorkbenchToolMutation({
      onCompleted: ({ createWorkbenchTool }) => {
        const name = createWorkbenchTool?.name ?? 'Tool'
        popToast({ name, action: 'created', color: 'icon-success' })
        navigate(WORKBENCHES_TOOLS_YOUR_ABS_PATH)
      },
    })
  const [update, { loading: updateLoading, error: updateError }] =
    useUpdateWorkbenchToolMutation({
      onCompleted: ({ updateWorkbenchTool }) => {
        const name = updateWorkbenchTool?.name ?? 'Tool'
        popToast({ name, action: 'updated', color: 'icon-success' })
      },
    })
  const mutationLoading = createLoading || updateLoading
  const mutationError = createError || updateError
  const onSave = (state: WorkbenchToolFormState) => {
    const attributes = formStateToAttributes(state, type)
    if (mode === 'create') create({ variables: { attributes } })
    else update({ variables: { id: id ?? '', attributes } })
  }

  return (
    <WrapperSC>
      <StretchedFlex>
        <StackedText
          first={
            mode === 'create'
              ? `New ${provider ? PROVIDER_TO_LABEL[provider] : TOOL_TYPE_TO_LABEL[type]} tool`
              : 'Edit tool'
          }
          firstPartialType="subtitle1"
          firstColor="text"
          second="Integrate external tools with your workbenches"
          secondPartialType="body1"
          gap="xsmall"
        />
        {!isLoading && (
          <Flex
            gap="xsmall"
            align="center"
          >
            <IconFrame
              circle
              type="secondary"
              icon={
                <WorkbenchToolIcon
                  type={type}
                  provider={provider}
                />
              }
              textValue={capitalize(provider || type)}
            />
            <Subtitle1H1 as="h3">
              {type === WorkbenchToolType.Cloud && provider
                ? PROVIDER_TO_LABEL[provider]
                : capitalize(type === WorkbenchToolType.Http ? 'Custom' : type)}
            </Subtitle1H1>
          </Flex>
        )}
      </StretchedFlex>
      {error && <GqlError error={error} />}
      {mutationError && <GqlError error={mutationError} />}
      {isLoading ? (
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      ) : (
        <Flex
          gap="medium"
          height="100%"
          minHeight={0}
        >
          <WorkbenchToolForm
            key={`${JSON.stringify(tool)}`} // reset form state if data updates
            type={type}
            provider={provider}
            tool={tool}
            mutationLoading={mutationLoading}
            backPath={
              mode === 'create'
                ? WORKBENCHES_TOOLS_ADD_ABS_PATH
                : WORKBENCHES_TOOLS_YOUR_ABS_PATH
            }
            onSave={onSave}
            onToolDeleted={() => navigate(WORKBENCHES_TOOLS_YOUR_ABS_PATH)}
          />
          {/* TODO */}
          {/* <Button
            secondary
            startIcon={<SidePanelOpenIcon />}
            css={{
              alignSelf: 'flex-start',
              border: borders.default,
              borderRadius: borderRadiuses.large,
            }}
          >
            Setup guide
          </Button> */}
        </Flex>
      )}
    </WrapperSC>
  )
}

function formStateToAttributes(
  state: WorkbenchToolFormState,
  type: WorkbenchToolType
): WorkbenchToolAttributes {
  const { name, categories, configuration, cloudConnectionId } = state
  const base: WorkbenchToolAttributes = { tool: type, name, categories }

  if (type === WorkbenchToolType.Cloud)
    return { ...base, cloudConnectionId: cloudConnectionId ?? null }

  if (!isConfigurableWorkbenchToolType(type) || !configuration) return base

  const configKey = CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY[type]
  const sanitized = deepOmitBlank(configuration[configKey])

  if (isEmpty(sanitized)) return base

  return { ...base, configuration: { [configKey]: sanitized } }
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: theme.spacing.large,
  height: '100%',
  width: '100%',
  minHeight: 0,
  maxWidth: 800,
}))
