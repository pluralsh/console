import {
  Button,
  Flex,
  IconFrame,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import {
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
  WORKBENCHES_TOOLS_ABS_PATH,
  WORKBENCHES_TOOLS_PARAM_ID,
  WORKBENCHES_TOOLS_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { deepOmitBlank } from 'utils/graphql'
import {
  isConfigurableWorkbenchToolType,
  CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY,
  WorkbenchToolIcon,
} from './workbenchToolsUtils'
import { WorkbenchToolForm, WorkbenchToolFormState } from './WorkbenchToolForm'
import { getWorkbenchesBreadcrumbs } from '../Workbenches'

export const WORKBENCHES_TOOLS_TYPE_PARAM = 'type'

const getBreadcrumbs = (mode: 'create' | 'edit') => [
  ...getWorkbenchesBreadcrumbs(WORKBENCHES_TOOLS_REL_PATH),
  { label: mode === 'create' ? 'create' : 'edit' },
]

export function WorkbenchToolCreateOrEdit({
  mode,
}: {
  mode: 'create' | 'edit'
}) {
  const navigate = useNavigate()
  const { borderRadiuses, borders } = useTheme()
  const id = useParams()[WORKBENCHES_TOOLS_PARAM_ID]
  const [searchParams, setSearchParams] = useSearchParams()
  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(mode), [mode]))

  const { data, loading, error, refetch } = useWorkbenchToolQuery({
    variables: { id },
    skip: mode === 'create' || !id,
    fetchPolicy: 'network-only',
  })

  const tool = data?.workbenchTool
  const isLoading = !tool && loading

  useLayoutEffect(() => {
    if (isLoading) return
    const typeParam = searchParams.get(WORKBENCHES_TOOLS_TYPE_PARAM)
    if (
      (id && typeParam !== tool?.tool) ||
      !isConfigurableWorkbenchToolType(typeParam)
    )
      setSearchParams({
        [WORKBENCHES_TOOLS_TYPE_PARAM]: tool?.tool ?? WorkbenchToolType.Http,
      })
  }, [id, searchParams, setSearchParams, tool, isLoading])

  const type = (searchParams.get(WORKBENCHES_TOOLS_TYPE_PARAM) ??
    '') as WorkbenchToolType // the effect above ensures this type is valid

  const [create, { loading: createLoading, error: createError }] =
    useCreateWorkbenchToolMutation({
      onCompleted: () => {
        navigate(WORKBENCHES_TOOLS_ABS_PATH)
        // pop toast
      },
    })
  const [update, { loading: updateLoading, error: updateError }] =
    useUpdateWorkbenchToolMutation({
      onCompleted: ({ updateWorkbenchTool: _updateWorkbenchTool }) => {
        refetch().then(() => {
          // pop toast
        })
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
          first={mode === 'create' ? 'New tool' : 'Edit tool'}
          firstPartialType="subtitle1"
          firstColor="text"
          second="Integrate external observability provider tools with your workbenches"
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
              icon={<WorkbenchToolIcon type={type} />}
              textValue={capitalize(type)}
            />
            <Subtitle1H1 as="h3">
              {capitalize(type === WorkbenchToolType.Http ? 'Custom' : type)}
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
            tool={tool}
            mutationLoading={mutationLoading}
            onCancel={() => navigate(WORKBENCHES_TOOLS_ABS_PATH)}
            onSave={onSave}
          />
          <Button
            secondary
            startIcon={<SidePanelOpenIcon />}
            css={{
              alignSelf: 'flex-start',
              border: borders.default,
              borderRadius: borderRadiuses.large,
            }}
          >
            Setup guide
          </Button>
        </Flex>
      )}
    </WrapperSC>
  )
}

function formStateToAttributes(
  state: WorkbenchToolFormState,
  type: WorkbenchToolType
): WorkbenchToolAttributes {
  const { name, categories, configuration } = state
  const base = { tool: type, name, categories }
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
