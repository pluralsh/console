import { MentionKind } from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import { serializeChipAttrs } from 'components/utils/contentEditableChips'
import {
  SentinelRunFragment,
  SentinelRunJobFormat,
  SentinelRunJobFragment,
} from 'generated/graphql'
import { parseJunit, TestCase, TestSuite } from 'utils/junitParse'
import { isNonNullable } from 'utils/isNonNullable'
import { getRunNameFromId } from './sentinel/SentinelRunsTables'

const MAX_ERROR_CHARS = 1500
const MAX_OUTPUT_CHARS = 2000
const MAX_FAILURE_MESSAGE_CHARS = 300
const MAX_FAILED_CASES = 15

export function serializeSentinelRunJobMention(
  job: SentinelRunJobFragment
): string {
  return serializeChipAttrs(MentionKind.SentinelRunJob, {
    'item-id': job.id,
    'item-name': job.check ?? job.reference?.name ?? job.id,
    status: job.status,
    check: job.check,
    format: job.format,
    'sentinel-id': job.sentinelRun?.sentinel?.id,
    'sentinel-name': job.sentinelRun?.sentinel?.name,
    'run-id': job.sentinelRun?.id,
    'cluster-id': job.cluster?.id,
    'cluster-handle': job.cluster?.handle,
    'job-namespace': job.reference?.namespace,
    'job-name': job.reference?.name,
    error: truncateHead(job.error?.trim(), MAX_ERROR_CHARS),
    output: summarizeJobOutput(job),
  })
}

export function serializeSentinelRunMention(run: SentinelRunFragment): string {
  return serializeChipAttrs(MentionKind.SentinelRun, {
    'item-id': run.id,
    'item-name': `${run.sentinel?.name ?? 'sentinel'} ${getRunNameFromId(run.id)}`,
    status: run.status,
    'sentinel-id': run.sentinel?.id,
    'sentinel-name': run.sentinel?.name,
    description: run.sentinel?.description,
    results: (run.results ?? [])
      .filter(isNonNullable)
      .map(
        (result) =>
          `${result.name}: ${result.status}` +
          (result.jobCount
            ? ` (${result.failedCount ?? 0}/${result.jobCount} jobs failed)`
            : '') +
          (result.reason ? ` ${result.reason}` : '')
      )
      .join('\n'),
    errors: truncateHead(
      (run.errors ?? [])
        .filter(isNonNullable)
        .map((err) => `${err.source}: ${err.message}`)
        .join('\n'),
      MAX_ERROR_CHARS
    ),
  })
}

export function buildSentinelRunJobWorkbenchPrompt(
  job: SentinelRunJobFragment
): string {
  const cluster = job.cluster
  const clusterMention = cluster?.id
    ? serializeChipAttrs(MentionKind.Cluster, {
        'item-id': cluster.id,
        'item-name': cluster.name,
        handle: cluster.handle,
        distro: cluster.distro,
        provider: cluster.provider?.cloud,
      })
    : 'its cluster'

  return `A sentinel integration test job failed on ${clusterMention}:

${serializeSentinelRunJobMention(job)}

Investigate why it failed. Pull the job's full output and the rest of its sentinel run with the sentinel tools, then determine whether this is a runtime or configuration problem with the test job itself (reported in its error, e.g. the pod couldn't be scheduled, pull its image or compile the tests) or a real infrastructure problem on the cluster that the failing test cases surfaced. Trace the cause back to the Plural services or stacks that own it, and fix it if you can confirm it.`
}

export function buildSentinelRunWorkbenchPrompt(
  run: SentinelRunFragment
): string {
  return `A sentinel run failed:

${serializeSentinelRunMention(run)}

Investigate the failing checks. Use the sentinel tools to list the run's failed jobs and inspect their errors and test output, grouping failures that share a root cause and noting which clusters each one affects. Separate runtime or configuration problems with the test jobs themselves from real infrastructure problems the tests surfaced, compare against the sentinel's previous runs to find when it started failing, and trace each cause back to the Plural services or stacks that own it. Fix what you can confirm.`
}

function summarizeJobOutput(job: SentinelRunJobFragment): string | undefined {
  const output = job.output?.trim()
  if (!output) return undefined

  if (job.format === SentinelRunJobFormat.Junit) {
    const failures = junitFailures(output)
    if (failures !== null) return failures
  }

  return truncateTail(output, MAX_OUTPUT_CHARS)
}

function junitFailures(output: string): string | null {
  let suites: Nullable<ReturnType<typeof parseJunit>>
  try {
    suites = parseJunit(output)
  } catch {
    return null
  }
  if (!suites) return null

  const failed = flattenCases(suites.testsuite ?? []).filter(
    (testCase) => testCase.failure?.length || testCase.error?.length
  )
  if (!failed.length) return 'No failing test cases'

  const lines = failed.slice(0, MAX_FAILED_CASES).map((testCase) => {
    const result = testCase.failure?.[0] ?? testCase.error?.[0]
    const message = String(result?.message || result?.inner || '').trim()
    const name = [testCase.classname, testCase.name].filter(Boolean).join('/')
    return message
      ? `FAIL ${name}: ${truncateHead(message, MAX_FAILURE_MESSAGE_CHARS)}`
      : `FAIL ${name}`
  })
  if (failed.length > MAX_FAILED_CASES)
    lines.push(`...and ${failed.length - MAX_FAILED_CASES} more failing cases`)

  return truncateHead(lines.join('\n'), MAX_OUTPUT_CHARS) ?? null
}

function flattenCases(suites: TestSuite[]): TestCase[] {
  return suites.flatMap((suite) => [
    ...(suite.testcase ?? []),
    ...flattenCases(suite.testsuite ?? []),
  ])
}

function truncateHead(text: Nullable<string>, max: number) {
  if (!text) return undefined
  return text.length > max ? `${text.slice(0, max - 3)}...` : text
}

function truncateTail(text: string, max: number) {
  return text.length > max ? `...${text.slice(text.length - max + 3)}` : text
}
