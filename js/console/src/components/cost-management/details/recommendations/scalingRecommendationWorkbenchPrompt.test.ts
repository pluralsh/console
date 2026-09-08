import { ClusterScalingRecommendationFragment } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { buildScalingRecommendationWorkbenchPrompt } from './scalingRecommendationWorkbenchPrompt'

const cluster = {
  id: 'cluster-1',
  name: 'production',
  distro: 'EKS',
}

const recommendation = {
  id: 'recommendation-1',
  namespace: 'payments',
  name: 'checkout',
  type: 'DEPLOYMENT',
  container: 'api',
  cpuRequest: 0.5,
  cpuRecommendation: 0.25,
  memoryRequest: 268435456,
  memoryRecommendation: 134217728,
} as ClusterScalingRecommendationFragment

describe('buildScalingRecommendationWorkbenchPrompt', () => {
  it('includes the cluster, service, Kubernetes object, and recommendation', () => {
    const prompt = buildScalingRecommendationWorkbenchPrompt(cluster, {
      ...recommendation,
      service: { id: 'service-1', name: 'checkout' },
    } as ClusterScalingRecommendationFragment)

    expect(prompt).toContain(
      'recommendation for <plrl-cluster item-id="cluster-1" item-name="production" distro="EKS"></plrl-cluster> in the Plural service <plrl-service item-id="service-1" item-name="checkout"></plrl-service>.'
    )
    expect(prompt).toContain('## Kubernetes object')
    expect(prompt).toContain('**Type:** DEPLOYMENT')
    expect(prompt).toContain('**Namespace:** payments')
    expect(prompt).toContain('**Container:** api')
    expect(prompt).toContain('| CPU | 500m | 250m |')
    expect(prompt).toContain('| Memory | 268.44Mi | 134.22Mi |')
  })

  it('omits the service section when no Plural service is associated', () => {
    const prompt = buildScalingRecommendationWorkbenchPrompt(
      cluster,
      recommendation
    )

    expect(prompt).toContain('recommendation for')
    expect(prompt).toContain('production')
    expect(prompt).not.toContain('Plural service')
    expect(prompt).toContain('## Kubernetes object')
    expect(prompt).toContain('## Recommendation')
  })
})
