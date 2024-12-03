export const CATALOGS_ABS_PATH = '/catalogs'

export const CATALOG_PARAM_ID = 'id'
export const CATALOG_ABS_PATH = getCatalogAbsPath(`:${CATALOG_PARAM_ID}`)

export function getCatalogAbsPath(id: string | null | undefined) {
  return `${CATALOGS_ABS_PATH}/${id}`
}
