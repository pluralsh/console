import { GlobalServiceFragment } from '../../../../generated/graphql.ts'
import {
  CD_REL_PATH,
  GLOBAL_SERVICES_REL_PATH,
} from '../../../../routes/cdRoutesConsts.tsx'
import { CD_BASE_CRUMBS } from '../../ContinuousDeployment.tsx'

export const getBreadcrumbs = (
  globalServiceId: string,
  globalService: Nullable<GlobalServiceFragment>
) => [
  ...CD_BASE_CRUMBS,
  {
    label: 'global services',
    url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}`,
  },
  {
    label: globalService?.name || globalServiceId,
    url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}/${globalServiceId}`,
  },
]
