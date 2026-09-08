import {
  CaretDownIcon,
  Chip,
  ChipProps,
  CloseIcon,
  ComponentsIcon,
  Flex,
  IconFrame,
  Input,
  ListBoxFooterPlus,
  ListBoxItem,
  NetworkInterfaceIcon,
  SearchIcon,
  Select,
  Table,
} from '@pluralsh/design-system'
import { Key } from '@react-types/shared'
import { clusterDeprecatedCustomResourcesColumns } from 'components/cd/clusters/clusterDeprecatedCustomResourcesColumns'
import { useThrottle } from 'components/hooks/useThrottle'
import { CaptionP } from 'components/utils/typography/Text'
import Fuse from 'fuse.js'
import { ClusterUpgradeDeprecatedCustomResourceFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { ConfettiEmptyState, UpgradeAccordionName } from './ClusterUpgradePlan'
import { ClusterUpgradePlanAccordion } from './ClusterUpgradePlanAccordion'

const deprecatedCRSearchOptions: Fuse.IFuseOptions<ClusterUpgradeDeprecatedCustomResourceFragment> =
  {
    keys: ['name', 'namespace', 'group'],
    threshold: 0.25,
    ignoreLocation: true,
  }

export function ClusterUpgradePlanCRAccordion({
  deprecatedCRs,
  defaultValue,
}: {
  deprecatedCRs: ClusterUpgradeDeprecatedCustomResourceFragment[]
  defaultValue: string
}) {
  const [searchQ, setSearchQ] = useState('')
  const throttledSearchQ = useThrottle(searchQ, 150)

  const [selectedGroups, setSelectedGroups] = useState<Set<Key>>(
    () => new Set()
  )
  const [selectedKinds, setSelectedKinds] = useState<Set<Key>>(() => new Set())

  const filteredDeprecatedCRs = useMemo(() => {
    const resources =
      deprecatedCRs
        ?.filter(isNonNullable)
        .filter(
          ({ group, kind }) =>
            (selectedGroups.size === 0 || selectedGroups.has(group)) &&
            (selectedKinds.size === 0 || selectedKinds.has(kind))
        ) ?? []
    return !throttledSearchQ
      ? resources
      : new Fuse(resources, deprecatedCRSearchOptions)
          .search(throttledSearchQ)
          .map(({ item }) => item)
  }, [deprecatedCRs, throttledSearchQ, selectedGroups, selectedKinds])

  const {
    allKinds,
    allGroups,
    kindsByGroup,
  }: {
    kindsByGroup: Record<string, Set<string>>
    allGroups: string[]
    allKinds: string[]
  } = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    const kindSet = new Set<string>()
    const groupSet = new Set<string>()
    deprecatedCRs.forEach(({ group, kind }) => {
      if (!map[group]) map[group] = new Set()
      map[group].add(kind)
      kindSet.add(kind)
      groupSet.add(group)
    })
    return {
      kindsByGroup: map,
      allKinds: kindSet.values().toArray(),
      allGroups: groupSet.values().toArray(),
    }
  }, [deprecatedCRs])

  return (
    <ClusterUpgradePlanAccordion
      defaultValue={defaultValue}
      name={UpgradeAccordionName.CustomResources}
      checked={isEmpty(deprecatedCRs)}
      title="Deprecated custom resources"
      subtitle="Ensure all custom resources are updated to the version required for upgrade"
    >
      <Flex
        gap="small"
        padding="medium"
        paddingTop={0}
      >
        <Input
          css={{ background: 'transparent', flex: 1 }}
          placeholder="Search custom resources"
          startIcon={<SearchIcon />}
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
        <Select
          selectionMode="multiple"
          selectedKeys={selectedGroups}
          onSelectionChange={(keys) => {
            // remove kind selections not in any selected group(s)
            const validGroupKinds = keys
              .values()
              .map((group) => kindsByGroup[group])
              .reduce((acc, curr) => acc.union(curr), new Set())

            setSelectedKinds((prev) => prev.intersection(validGroupKinds))
            setSelectedGroups(keys)
          }}
          dropdownFooterFixed={
            selectedGroups.size > 0 && (
              <ListBoxFooterPlus
                leftContent={<CloseIcon />}
                onClick={() => {
                  setSelectedGroups(new Set())
                  setSelectedKinds(new Set())
                }}
              >
                Clear selections
              </ListBoxFooterPlus>
            )
          }
          width={300}
          triggerButton={
            <FilterTriggerButton
              numSelected={selectedGroups.size}
              type="group"
            />
          }
        >
          {allGroups.map((group) => (
            <ListBoxItem
              key={group}
              label={group}
            />
          ))}
        </Select>
        <Select
          selectionMode="multiple"
          selectedKeys={selectedKinds}
          onSelectionChange={setSelectedKinds}
          width={300}
          triggerButton={
            <FilterTriggerButton
              numSelected={selectedKinds.size}
              type="kind"
            />
          }
          dropdownFooterFixed={
            selectedKinds.size > 0 && (
              <ListBoxFooterPlus
                leftContent={<CloseIcon />}
                onClick={() => setSelectedKinds(new Set())}
              >
                Clear selections
              </ListBoxFooterPlus>
            )
          }
        >
          {isEmpty(selectedGroups)
            ? allKinds.map((kind) => (
                <ListBoxItem
                  key={kind}
                  label={kind}
                />
              ))
            : selectedGroups
                .values()
                .flatMap((group) =>
                  kindsByGroup[group].values().map((kind) => (
                    <ListBoxItem
                      key={kind}
                      label={kind}
                    />
                  ))
                )
                .toArray()}
        </Select>
      </Flex>
      {!isEmpty(deprecatedCRs) ? (
        <Table
          flush
          virtualizeRows
          data={filteredDeprecatedCRs}
          columns={clusterDeprecatedCustomResourcesColumns}
          height={300}
          emptyStateProps={{
            message: 'No custom resources match your search.',
          }}
        />
      ) : (
        <ConfettiEmptyState description="You do not have any deprecated custom resources." />
      )}
    </ClusterUpgradePlanAccordion>
  )
}

function FilterTriggerButton({
  numSelected,
  type,
  ...props
}: {
  numSelected: number
  type: 'group' | 'kind'
} & ChipProps) {
  return (
    <Chip
      clickable
      css={{ height: '100%' }}
      {...props}
    >
      <Flex
        gap="xsmall"
        align="center"
      >
        {numSelected > 0 ? (
          <Chip size="small">{numSelected}</Chip>
        ) : (
          <IconFrame
            size="xsmall"
            icon={
              type === 'group' ? <NetworkInterfaceIcon /> : <ComponentsIcon />
            }
          />
        )}
        <CaptionP $color="text-xlight">Filter by {type}</CaptionP>
        <IconFrame
          size="xsmall"
          icon={<CaretDownIcon />}
        />
      </Flex>
    </Chip>
  )
}
