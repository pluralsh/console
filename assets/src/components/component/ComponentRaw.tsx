import { Card, Code, EmptyState, FileIcon } from '@pluralsh/design-system'
import { ComponentPropsWithRef, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import { stringify } from 'yaml'
import isEmpty from 'lodash/isEmpty'
import { ComponentDetailsContext } from './ComponentDetails'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'

export function ComponentRaw() {
  const { componentDetails, loading } =
    useOutletContext<ComponentDetailsContext>()

  return (
    <RawYaml
      raw={componentDetails?.raw}
      loading={loading}
    />
  )
}

export function RawYaml({
  raw,
  loading,
  ...props
}: {
  raw?: Nullable<object | string>
  loading?: boolean
} & ComponentPropsWithRef<typeof Code>) {
  const rawStr = useMemo(
    () =>
      raw ? stringify(typeof raw === 'string' ? JSON.parse(raw) : raw) : '',
    [raw]
  )

  if (isEmpty(raw))
    return loading ? (
      <Card
        header={{
          size: 'large',
          content: (
            <StackedText
              first="yaml"
              firstPartialType="overline"
              firstColor="text"
              iconGap="xsmall"
              icon={<FileIcon color="text" />}
            />
          ),
        }}
        css={{ height: '100%', width: '100%' }}
      >
        <RectangleSkeleton
          $width="100%"
          $height="100%"
        />
      </Card>
    ) : (
      <EmptyState message="No data available." />
    )

  return (
    <Code
      language="yaml"
      maxHeight="100%"
      overflowY="auto"
      {...props}
    >
      {rawStr}
    </Code>
  )
}

export function RawJson({ raw }: { raw?: object | string | null | undefined }) {
  const rawStr = useMemo(() => {
    let json: string

    try {
      json = raw
        ? JSON.stringify(
            typeof raw === 'string' ? JSON.parse(raw) : raw,
            null,
            2
          )
        : ''
    } catch {
      json = typeof raw === 'string' ? raw : ''
    }

    return json
  }, [raw])

  if (isEmpty(raw)) {
    return <EmptyState message="No data available." />
  }

  return (
    <Code
      language="json"
      maxHeight="100%"
      overflowY="auto"
    >
      {rawStr}
    </Code>
  )
}
