import {
  ArrowTopRightIcon,
  Button,
  Chip,
  ChipList,
  GlobeIcon,
  IconFrame,
  PlusIcon,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import { ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  GlobalServiceFragment,
  ServiceTemplate,
} from '../../../../generated/graphql.ts'
import { getServiceDetailsPath } from '../../../../routes/cdRoutesConsts.tsx'
import { DistroProviderIcon } from '../../../utils/ClusterDistro.tsx'
import { TagsModal } from './TagsModal.tsx'
import { TemplateModal } from './TemplateModal.tsx'

interface GlobalServiceSidecarProps {
  globalService: GlobalServiceFragment
}

export default function GlobalServiceSidecar({
  globalService,
}: GlobalServiceSidecarProps): ReactNode {
  const theme = useTheme()
  const navigate = useNavigate()
  const [openEditTags, setOpenEditTags] = useState<boolean>(false)
  const [viewTemplate, setViewTemplate] = useState<boolean>(false)

  return (
    <>
      <Sidecar heading="Source">
        <SidecarItem heading="Type">
          <Chip>{globalService?.service ? 'Seed service' : 'Template'}</Chip>
        </SidecarItem>
        {globalService?.service && (
          <SidecarItem heading="Seed service">
            {globalService.service.name}
          </SidecarItem>
        )}
        <SidecarItem>
          {globalService?.service ? (
            <Button
              small
              secondary
              endIcon={<ArrowTopRightIcon />}
              onClick={() =>
                navigate(
                  getServiceDetailsPath({
                    serviceId: globalService.service?.id ?? '',
                    clusterId: globalService.service?.cluster?.id ?? '',
                  })
                )
              }
            >
              Go to root service
            </Button>
          ) : (
            <Button
              small
              secondary
              onClick={() => setViewTemplate(true)}
            >
              View template
            </Button>
          )}
        </SidecarItem>
      </Sidecar>
      <Sidecar heading="Targeting criteria">
        <SidecarItem heading="Project">
          {globalService?.project?.name ?? 'default'}
        </SidecarItem>
        <SidecarItem heading="Distribution">
          <div
            css={{
              ...theme.partials.text.body2,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.small,
            }}
          >
            <IconFrame
              size="small"
              type="secondary"
              icon={
                globalService?.distro ? (
                  <DistroProviderIcon
                    distro={globalService.distro}
                    provider={globalService.provider?.name}
                    size={16}
                  />
                ) : (
                  <GlobeIcon size={16} />
                )
              }
            />
            {globalService?.distro || 'All distribution'}
          </div>
        </SidecarItem>
        <SidecarItem heading="Tags">
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.small,
              alignItems: 'center',
            }}
          >
            {(globalService?.tags?.length ?? 0) > 0 && (
              <ChipList
                limit={8}
                values={globalService?.tags ?? []}
                transformValue={(tag) => `${tag?.name}: ${tag?.value}`}
                emptyState={null}
              />
            )}
            <IconFrame
              clickable
              size="small"
              type="secondary"
              icon={<PlusIcon color="icon-light" />}
              onClick={() => setOpenEditTags(true)}
            ></IconFrame>
          </div>
        </SidecarItem>
      </Sidecar>
      <Sidecar heading="Cascading logic">
        <SidecarItem heading="Cascade">
          {globalService?.cascade?.delete && <Chip>Delete</Chip>}
          {globalService?.cascade?.detach && <Chip>Detach</Chip>}
        </SidecarItem>
        <SidecarItem heading="Reparent">
          <Chip severity={globalService?.reparent ? 'success' : 'danger'}>
            {globalService?.reparent ? 'True' : 'False'}
          </Chip>
        </SidecarItem>
      </Sidecar>
      {/* Modals */}
      <TagsModal
        globalService={globalService}
        refetch={() => {}}
        open={openEditTags}
        onClose={() => setOpenEditTags(false)}
      />
      <TemplateModal
        template={globalService?.template ?? ({} as ServiceTemplate)}
        serviceName={globalService?.name}
        open={viewTemplate}
        onClose={() => setViewTemplate(false)}
      />
    </>
  )
}
