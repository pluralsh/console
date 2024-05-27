import {
  Button,
  ContentCard,
  FormField,
  Input,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import React, { useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useTheme } from 'styled-components'
import { Flex, P } from 'honorable'
import { isEmpty } from 'lodash'

import { StackOutletContextT, getBreadcrumbs } from '../Stack'
import ConsolePageTitle from '../../../utils/layout/ConsolePageTitle'
import { useGitRepositoriesQuery } from '../../../../generated/graphql'
import { RepositorySelector } from '../../../cd/services/deployModal/DeployServiceSettingsGit'
import { mapExistingNodes } from '../../../../utils/graphql'

export default function StackEdit() {
  const theme = useTheme()
  const { stackId = '' } = useParams()
  const { stack } = useOutletContext() as StackOutletContextT
  const [image, setImage] = useState(stack.configuration.image)
  const [version, setVersion] = useState(stack.configuration.version)
  const [repositoryId, setRepositoryId] = useState(stack.repository?.id)
  const [ref, setRef] = useState(stack.git.ref)
  const [folder, setFolder] = useState(stack.git.folder)
  const changed =
    image !== stack.configuration.image ||
    version !== stack.configuration.version ||
    repositoryId !== stack.repository?.id ||
    ref !== stack.git.ref ||
    folder !== stack.git.folder
  const valid =
    !isEmpty(version) &&
    !isEmpty(repositoryId) &&
    !isEmpty(ref) &&
    !isEmpty(folder)

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stackId), { label: 'repository' }],
      [stackId]
    )
  )

  const { data } = useGitRepositoriesQuery()

  const repos = mapExistingNodes(data?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )

  // const { data: repoData } = useGitRepositoryQuery({
  //   variables: { id: repositoryId },
  // })

  if (!stack) {
    return <LoadingIndicator />
  }

  return (
    <>
      <ConsolePageTitle
        heading="Edit"
        headingProps={{
          paddingTop: theme.spacing.small,
          paddingBottom: theme.spacing.medium,
        }}
      />
      <ContentCard>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.small,
            marginBottom: theme.spacing.large,
          }}
        >
          <FormField label="Image">
            <Input
              value={image}
              onChange={(e) => setImage(e.currentTarget.value)}
            />
          </FormField>
          <FormField
            label="Version"
            required
          >
            <Input
              value={version}
              onChange={(e) => setVersion(e.currentTarget.value)}
            />
          </FormField>
          <FormField
            label="Repository"
            required
          >
            <RepositorySelector
              repositories={repos}
              repositoryId={repositoryId}
              setRepositoryId={setRepositoryId}
            />
          </FormField>
          <FormField
            label="Ref"
            required
          >
            <Input
              value={ref}
              onChange={(e) => setRef(e.currentTarget.value)}
            />
          </FormField>
          <FormField
            label="Folder"
            required
          >
            <Input
              value={folder}
              onChange={(e) => setFolder(e.currentTarget.value)}
            />
          </FormField>
        </div>
        <Flex
          align="center"
          gap="medium"
          justifyContent="flex-end"
          marginTop="small"
        >
          {changed && (
            <P
              body2
              color="text-xlight"
            >
              Unsaved changes
            </P>
          )}
          <Button
            disabled={!valid || !changed}
            // onClick={() => mutation()}
            // loading={loading}
          >
            Save
          </Button>
        </Flex>
      </ContentCard>
    </>
  )
}
