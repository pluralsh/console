/**
 * Parses the Plural OpenAPI schema to extract all API operations and build
 * the data shape used by the REST API reference page.
 *
 * Fetches the spec at runtime with per-pod in-memory cache (TTL and stale-on-error).
 * Configure via OPENAPI_SPEC_URL and OPENAPI_CACHE_TTL_MS (default 24h).
 */

import SwaggerParser from '@apidevtools/swagger-parser'
import isEmpty from 'lodash/isEmpty'

import type { OpenAPIV3, OpenAPIV3_1 as OpenApiV31 } from 'openapi-types'

const DEFAULT_OPENAPI_URL =
  'https://raw.githubusercontent.com/pluralsh/console/refs/heads/master/schema/openapi.json'

/** Default TTL 24h so we hit the upstream at most ~once per day per pod. */
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000

function getOpenApiSpecUrl(): string {
  if (
    typeof process.env.OPENAPI_SPEC_URL === 'string' &&
    process.env.OPENAPI_SPEC_URL
  )
    return process.env.OPENAPI_SPEC_URL

  return DEFAULT_OPENAPI_URL
}

function getCacheTtlMs(): number {
  const raw = process.env.OPENAPI_CACHE_TTL_MS

  if (raw == null || raw === '') return DEFAULT_CACHE_TTL_MS

  const n = parseInt(raw, 10)

  return Number.isNaN(n) || n < 0 ? DEFAULT_CACHE_TTL_MS : n
}

/** Per-pod cache state (server-only; never runs in browser). */
let cachedPayload: {
  apiSections: ApiSection[]
  endpointDetails: Record<string, EndpointDetail>
} | null = null
let cachedAt: number = 0
let inFlight: Promise<{
  apiSections: ApiSection[]
  endpointDetails: Record<string, EndpointDetail>
}> | null = null

export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT'

export interface Endpoint {
  id: string
  name: string
  path: string
  method: HttpMethod
}

export interface ApiSection {
  title: string
  endpoints: Endpoint[]
}

export interface Parameter {
  name: string
  type: string
  required?: boolean
  description?: string | null
  kind?: 'query' | 'path' | 'body'
}

export interface ResponseSample {
  status: number
  statusLabel: string
  body: string
}

export interface SchemaProperty {
  name: string
  type: string
  description?: string | null
  enum?: string[]
  format?: string
  required?: boolean
  properties?: SchemaProperty[]
  arrayItemType?: string
  arrayItemProperties?: SchemaProperty[]
}

export interface ResponseSchemaInfo {
  status: number
  statusLabel: string
  description?: string
  contentType: string
  properties: SchemaProperty[]
}

export interface EndpointDetail {
  id: string
  operationName: string
  method: HttpMethod
  path: string
  description: string
  parameters: Parameter[]
  responses: ResponseSample[]
  responseSchemas: ResponseSchemaInfo[]
}

type MethodKey = 'get' | 'post' | 'put' | 'patch' | 'delete'
type OpenApiDoc = OpenAPIV3.Document | OpenApiV31.Document
type SchemaObject = OpenAPIV3.SchemaObject | OpenApiV31.SchemaObject
type MaybeSchema =
  | OpenAPIV3.ReferenceObject
  | OpenAPIV3.SchemaObject
  | OpenApiV31.ReferenceObject
  | OpenApiV31.SchemaObject
  | null
  | undefined

const METHODS: MethodKey[] = ['get', 'post', 'put', 'patch', 'delete']

function isSchemaObject(schema: MaybeSchema): schema is SchemaObject {
  return !!schema && !('$ref' in schema)
}

function capitalizeWord(w: string): string {
  if (!w) return w

  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
}

function operationIdToTitle(opId: string): string {
  const words = opId
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(/\s+/)

  return words
    .map((w, i) => (i === 0 ? capitalizeWord(w) : w.toLowerCase()))
    .join(' ')
}

function tagToSection(tag: string): string {
  return tag.split('-').map(capitalizeWord).join(' ')
}

function hasSchemaProperties(schema: MaybeSchema): schema is
  | (OpenAPIV3.SchemaObject & {
      properties: Record<
        string,
        OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
      >
    })
  | (OpenApiV31.SchemaObject & {
      properties: Record<
        string,
        OpenApiV31.ReferenceObject | OpenApiV31.SchemaObject
      >
    }) {
  return !!schema && !('$ref' in schema) && !isEmpty(schema.properties)
}

function getComposedSchemaKind(
  schema: MaybeSchema
): 'allOf' | 'oneOf' | 'anyOf' | null {
  if (!isSchemaObject(schema)) return null
  if (!isEmpty(schema.allOf)) return 'allOf'
  if (!isEmpty(schema.oneOf)) return 'oneOf'
  if (!isEmpty(schema.anyOf)) return 'anyOf'

  return null
}

function getComposedSchemas(schema: MaybeSchema): SchemaObject[] {
  if (!isSchemaObject(schema)) return []

  const kind = getComposedSchemaKind(schema)

  if (!kind) return []

  return (schema[kind] ?? []).filter(isSchemaObject)
}

function getSchemaType(schema: MaybeSchema): string {
  if (!schema || '$ref' in schema) return 'string'
  const composedSchemas = getComposedSchemas(schema)

  if (!isEmpty(composedSchemas)) {
    if (getComposedSchemaKind(schema) === 'allOf') return 'object'

    const composedTypes = [...new Set(composedSchemas.map(getSchemaType))]

    return composedTypes.join(' | ') || 'string'
  }
  if (typeof schema.type === 'string') return schema.type
  if (hasSchemaProperties(schema)) return 'object'

  return 'string'
}

function resolveSchemaProperty(
  name: string,
  prop: MaybeSchema,
  isRequired: boolean,
  seen: Set<object>
): SchemaProperty {
  if (!prop || '$ref' in prop) {
    return {
      name,
      type: 'string',
      ...(isRequired ? { required: true } : {}),
    }
  }

  if (prop.type === 'array' && prop.items) {
    if ('$ref' in prop.items) {
      return {
        name,
        type: 'array',
        ...(isRequired ? { required: true } : {}),
        ...(prop.description && { description: prop.description }),
        arrayItemType: 'string',
      }
    }

    const { items } = prop
    const arrayItemProperties = resolveSchemaProperties(items, new Set(seen))

    return {
      name,
      type: 'array',
      arrayItemType: getSchemaType(items),
      ...(isRequired && { required: true }),
      ...(prop.description && { description: prop.description }),
      ...(!isEmpty(arrayItemProperties) && { arrayItemProperties }),
    }
  }

  if (hasSchemaProperties(prop)) {
    const properties = resolveSchemaProperties(prop, new Set(seen))

    return {
      name,
      type: 'object',
      ...(isRequired ? { required: true } : {}),
      ...(prop.description && { description: prop.description }),
      ...(!isEmpty(properties) ? { properties } : {}),
    }
  }

  return {
    name,
    type: getSchemaType(prop),
    ...(isRequired ? { required: true } : {}),
    ...(prop.description && { description: prop.description }),
    ...(!isEmpty(prop.enum) ? { enum: prop.enum } : {}),
    ...(prop.format ? { format: prop.format } : {}),
  }
}

function resolveSchemaProperties(
  schema: MaybeSchema,
  seen = new Set<object>()
): SchemaProperty[] {
  if (!schema || '$ref' in schema) return []
  if (seen.has(schema)) return []

  seen.add(schema)
  const composedSchemas = getComposedSchemas(schema)

  if (!isEmpty(composedSchemas)) {
    const mergedProperties = new Map<string, SchemaProperty>()

    for (const composedSchema of composedSchemas) {
      for (const property of resolveSchemaProperties(
        composedSchema,
        new Set(seen)
      )) {
        mergedProperties.set(property.name, property)
      }
    }

    return [...mergedProperties.values()]
  }

  if (!hasSchemaProperties(schema)) return []

  const required = schema.required ?? []
  const properties: SchemaProperty[] = []

  for (const [propName, prop] of Object.entries(schema.properties ?? {})) {
    properties.push(
      resolveSchemaProperty(
        propName,
        prop,
        required.includes(propName),
        new Set(seen)
      )
    )
  }

  return properties
}

function buildExampleFromSchema(
  schema: MaybeSchema,
  seen = new Set<object>()
): unknown {
  if (!schema || '$ref' in schema) return {}
  if (seen.has(schema)) return {}

  const composedSchemas = getComposedSchemas(schema)

  if (!isEmpty(composedSchemas)) {
    const nextSeen = new Set(seen)

    nextSeen.add(schema)

    if (getComposedSchemaKind(schema) === 'allOf') {
      const mergedExample: Record<string, unknown> = {}

      for (const composedSchema of composedSchemas) {
        const example = buildExampleFromSchema(
          composedSchema,
          new Set(nextSeen)
        )

        if (
          example &&
          typeof example === 'object' &&
          !Array.isArray(example) &&
          !isEmpty(example)
        ) {
          Object.assign(mergedExample, example)
        }
      }

      if (!isEmpty(mergedExample)) return mergedExample
    }

    for (const composedSchema of composedSchemas) {
      const example = buildExampleFromSchema(composedSchema, new Set(nextSeen))

      if (
        example != null &&
        (typeof example !== 'object' ||
          Array.isArray(example) ||
          !isEmpty(example))
      ) {
        return example
      }
    }
  }

  if (schema.type === 'array' && schema.items) {
    if ('$ref' in schema.items) return [{}]

    const item = buildExampleFromSchema(
      schema.items,
      new Set([...seen, schema])
    )

    return [item]
  }

  if (hasSchemaProperties(schema)) {
    const nextSeen = new Set(seen)

    nextSeen.add(schema)
    const obj: Record<string, unknown> = {}

    for (const [key, prop] of Object.entries(schema.properties ?? {})) {
      obj[key] = buildExampleFromSchema(prop, new Set(nextSeen))
    }

    return obj
  }

  if (schema.type === 'string') return schema.enum?.[0] ?? 'string'
  if (schema.type === 'integer' || schema.type === 'number') return 0
  if (schema.type === 'boolean') return false

  return {}
}

function getResponseSchema(response: OpenAPIV3.ResponseObject): MaybeSchema {
  return response?.content?.['application/json']?.schema ?? null
}

/** Parse status code string to number, e.g. "200" -> 200, "default" -> 200 */
function parseStatusCode(code: string): number {
  if (code === 'default') return 200
  const n = parseInt(code, 10)

  return Number.isNaN(n) ? 200 : n
}

/** Sort order for response codes: 2xx first, then 4xx, then 5xx, then others */
function responseStatusOrder(s: number): number {
  return s >= 200 && s < 300 ? 0 : s >= 400 && s < 500 ? 1 : s >= 500 ? 2 : 3
}

function sortByStatus(a: { status: number }, b: { status: number }): number {
  const diff = responseStatusOrder(a.status) - responseStatusOrder(b.status)

  return diff !== 0 ? diff : a.status - b.status
}

/** Section title used for the "other" tag; sort this last in section order. */
const SECTION_OTHER_TITLE = 'Other'

const FETCH_TIMEOUT_MS = 30_000

async function fetchOpenApiDocRaw(url: string): Promise<OpenApiDoc> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res: Response

  try {
    res = await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) throw new Error(`Failed to fetch OpenAPI: ${res.status}`)

  const rawDoc: OpenApiDoc = await res.json()
  const dereferenced = await SwaggerParser.dereference(rawDoc)

  if (
    !dereferenced ||
    typeof dereferenced !== 'object' ||
    !('openapi' in dereferenced)
  )
    throw new Error('Invalid OpenAPI document')

  return dereferenced
}

function parseOpenApiDocIntoRestData(doc: OpenApiDoc): {
  apiSections: ApiSection[]
  endpointDetails: Record<string, EndpointDetail>
} {
  const sectionsMap = new Map<string, Endpoint[]>()
  const endpointDetails: Record<string, EndpointDetail> = {}

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem || '$ref' in pathItem) continue

    for (const method of METHODS) {
      const op = pathItem[method]

      if (!op) continue

      const opId = op.operationId ?? `${method}-${path}`
      const httpMethod = method.toUpperCase() as HttpMethod

      const endpoint: Endpoint = {
        id: opId,
        name: op.summary ?? operationIdToTitle(opId),
        path,
        method: httpMethod,
      }

      const tag = op.tags?.[0] ?? 'other'
      const sectionTitle = tagToSection(tag)
      const existing = sectionsMap.get(sectionTitle) ?? []

      existing.push(endpoint)
      sectionsMap.set(sectionTitle, existing)

      const params: Parameter[] = []

      for (const p of op.parameters ?? []) {
        if ('$ref' in p) continue

        const kind =
          p.in === 'path' ? 'path' : p.in === 'query' ? 'query' : null

        if (!kind) continue
        const pSchema = p.schema && !('$ref' in p.schema) ? p.schema : undefined

        params.push({
          name: p.name,
          type: pSchema ? getSchemaType(pSchema) : 'string',
          required: p.required ?? false,
          description: p.description ?? null,
          kind,
        })
      }

      const requestBody =
        op.requestBody && !('$ref' in op.requestBody) ? op.requestBody : null
      const bodySchema = requestBody?.content?.['application/json']?.schema

      if (bodySchema) {
        for (const property of resolveSchemaProperties(bodySchema)) {
          params.push({
            name: property.name,
            type: property.type,
            ...(property.required != null && { required: property.required }),
            description: property.description ?? null,
            kind: 'body',
          })
        }
      }

      const responses: ResponseSample[] = []
      const responseSchemas: ResponseSchemaInfo[] = []

      for (const [code, responseRef] of Object.entries(op.responses ?? {})) {
        if ('$ref' in responseRef) continue

        const responseSpec = responseRef
        const status = parseStatusCode(code)
        const schema = getResponseSchema(responseSpec)
        const desc = responseSpec?.description
        const example = schema
          ? buildExampleFromSchema(schema)
          : desc
            ? { error: desc }
            : { message: `HTTP ${status}` }

        responses.push({
          status,
          statusLabel: code,
          body: JSON.stringify(example, null, 2),
        })

        if (schema) {
          responseSchemas.push({
            status,
            statusLabel: code,
            ...(desc != null && { description: desc }),
            contentType: 'application/json',
            properties: resolveSchemaProperties(schema),
          })
        }
      }
      responses.sort(sortByStatus)
      responseSchemas.sort(sortByStatus)

      if (isEmpty(responses))
        responses.push({ status: 200, statusLabel: '200', body: '{}' })

      const rawDesc = op.description ?? ''
      const description =
        !rawDesc || rawDesc.toLowerCase() === 'no description' ? '' : rawDesc

      const displayName = op.summary ?? operationIdToTitle(opId)

      endpointDetails[opId] = {
        id: opId,
        operationName: displayName,
        method: httpMethod,
        path,
        description,
        parameters: params,
        responses,
        responseSchemas,
      }
    }
  }

  const apiSections: ApiSection[] = []
  const sortedTitles = [...sectionsMap.keys()].sort((a, b) => {
    if (a === SECTION_OTHER_TITLE) return 1
    if (b === SECTION_OTHER_TITLE) return -1

    return a.localeCompare(b)
  })

  for (const title of sortedTitles) {
    const endpoints = sectionsMap.get(title) ?? []

    if (!isEmpty(endpoints)) apiSections.push({ title, endpoints })
  }

  return { apiSections, endpointDetails }
}

/**
 * Returns REST API reference data from the OpenAPI spec.
 * Uses per-pod in-memory cache with TTL; on refresh failure keeps serving stale if available.
 */
export async function fetchRestApiData(): Promise<{
  apiSections: ApiSection[]
  endpointDetails: Record<string, EndpointDetail>
}> {
  if (typeof window !== 'undefined') {
    throw new Error('fetchRestApiData is server-only')
  }

  const ttlMs = getCacheTtlMs()
  const now = Date.now()

  if (!!cachedPayload && now - cachedAt < ttlMs) return cachedPayload

  if (inFlight) return inFlight

  const url = getOpenApiSpecUrl()
  const doRefresh = async (): Promise<{
    apiSections: ApiSection[]
    endpointDetails: Record<string, EndpointDetail>
  }> => {
    try {
      const doc = await fetchOpenApiDocRaw(url)
      const payload = parseOpenApiDocIntoRestData(doc)

      cachedPayload = payload
      cachedAt = Date.now()

      return payload
    } catch (err) {
      if (cachedPayload != null) return cachedPayload

      throw err
    } finally {
      inFlight = null
    }
  }

  inFlight = doRefresh()

  return inFlight
}
