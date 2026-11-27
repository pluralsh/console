import {
  DevboxInstanceStatus,
  DevboxRebaseState,
  DevboxUpdateCampaignStatus,
  DevboxUpdateMode,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import {
  campaignSummary,
  canUpdate,
  deadlineText,
  isCampaignActive,
  UpdatableInstance,
  updateChip,
  updateConfirmText,
  updateModeLabel,
  versionChange,
} from './devboxUpdates'

const now = new Date('2026-11-24T12:00:00Z')

const instance = (
  over: Partial<UpdatableInstance> = {}
): UpdatableInstance => ({
  status: DevboxInstanceStatus.Running,
  outdated: true,
  rebaseState: null,
  rebaseError: null,
  rebaseRevision: null,
  templateRevision: '2',
  daemonVersion: '0.12.0',
  updateDeadlineAt: null,
  devbox: { revision: 3, daemonVersion: '0.12.1' },
  ...over,
})

describe('canUpdate', () => {
  it('needs an outdated instance that is running or suspended', () => {
    expect(canUpdate(instance())).toBe(true)
    expect(
      canUpdate(instance({ status: DevboxInstanceStatus.Suspended }))
    ).toBe(true)
    expect(canUpdate(instance({ outdated: false }))).toBe(false)
    expect(
      canUpdate(instance({ status: DevboxInstanceStatus.Provisioning }))
    ).toBe(false)
    expect(
      canUpdate(instance({ status: DevboxInstanceStatus.Completed }))
    ).toBe(false)
  })

  it('is off while an update is on its way', () => {
    expect(
      canUpdate(instance({ rebaseState: DevboxRebaseState.InProgress }))
    ).toBe(false)
    expect(canUpdate(instance({ rebaseState: DevboxRebaseState.Failed }))).toBe(
      true
    )
  })
})

describe('updateChip', () => {
  it('shows nothing for a current instance', () => {
    expect(updateChip(instance({ outdated: false }))).toBeNull()
    // an old failure doesn't stick once the instance is current
    expect(
      updateChip(
        instance({ outdated: false, rebaseState: DevboxRebaseState.Failed })
      )
    ).toBeNull()
  })

  it('offers the update with what changed', () => {
    expect(updateChip(instance())).toEqual({
      label: 'Update available',
      severity: 'warning',
      tooltip: 'devbox-daemon 0.12.0 → 0.12.1',
    })
  })

  it('prefers in-progress, then failure', () => {
    expect(
      updateChip(instance({ rebaseState: DevboxRebaseState.InProgress }))?.label
    ).toBe('Updating')
    const failed = updateChip(
      instance({
        rebaseState: DevboxRebaseState.Failed,
        rebaseError: 'actor crashed',
      })
    )
    expect(failed?.label).toBe('Update failed')
    expect(failed?.severity).toBe('danger')
    expect(failed?.tooltip).toContain('actor crashed')
  })
})

describe('versionChange', () => {
  it('names the daemon versions when the daemon changed', () => {
    expect(versionChange(instance())).toBe('devbox-daemon 0.12.0 → 0.12.1')
    expect(versionChange(instance({ daemonVersion: null }))).toBe(
      'A newer devbox runtime (devbox-daemon 0.12.1) is available'
    )
  })

  it('says the box changed otherwise, with the revisions when it knows them', () => {
    expect(versionChange(instance({ daemonVersion: '0.12.1' }))).toBe(
      "The box's image, agents or settings changed: revision 2 → 3"
    )
    expect(versionChange(instance({ devbox: null }))).toMatch(
      /image, agents or settings changed since/
    )
  })
})

describe('updateConfirmText', () => {
  it('says when the restart happens and what is lost', () => {
    const running = updateConfirmText({ status: DevboxInstanceStatus.Running })
    expect(running).toMatch(/restarts now/)
    expect(running).toMatch(/home directory, repositories and threads are kept/)
    expect(running).toMatch(/outside the home directory are lost/)
    expect(running).toMatch(/boot\.sh/)
    expect(
      updateConfirmText({ status: DevboxInstanceStatus.Suspended })
    ).toMatch(/next time it is resumed/)
  })
})

describe('deadlineText', () => {
  it('counts down in minutes', () => {
    expect(deadlineText('2026-11-24T12:15:00Z', now)).toBe('in 15 minutes')
    expect(deadlineText('2026-11-24T12:01:00Z', now)).toBe('in 1 minute')
    expect(deadlineText('2026-11-24T12:00:30Z', now)).toBe('in under a minute')
    expect(deadlineText('2026-11-24T11:59:00Z', now)).toBe('any moment now')
  })
})

describe('campaigns', () => {
  const campaign = {
    status: DevboxUpdateCampaignStatus.Running,
    force: false,
    startsAt: '2026-11-24T11:00:00Z',
    deadlineAt: null,
    progress: { outdated: 2, updated: 5, failed: 0 },
  }

  it('knows which are active', () => {
    expect(isCampaignActive(campaign)).toBe(true)
    expect(
      isCampaignActive({ status: DevboxUpdateCampaignStatus.Pending })
    ).toBe(true)
    expect(
      isCampaignActive({ status: DevboxUpdateCampaignStatus.Completed })
    ).toBe(false)
    expect(isCampaignActive(null)).toBe(false)
  })

  it('summarizes progress', () => {
    expect(campaignSummary(campaign, now)).toBe(
      'Running: 5 updated, 2 still outdated'
    )
    expect(
      campaignSummary(
        {
          ...campaign,
          progress: { outdated: 1, updated: 5, failed: 1 },
          status: DevboxUpdateCampaignStatus.Completed,
        },
        now
      )
    ).toBe('Finished: 5 updated, 1 failed')
  })

  it('shows the deadline of a forced campaign', () => {
    expect(
      campaignSummary(
        { ...campaign, force: true, deadlineAt: '2026-11-24T12:10:00Z' },
        now
      )
    ).toBe(
      'Instances in use restart in 10 minutes: 5 updated, 2 still outdated'
    )
  })
})

describe('updateModeLabel', () => {
  it('defaults to on resume', () => {
    expect(updateModeLabel(DevboxUpdateMode.Manual)).toBe('Manual')
    expect(updateModeLabel(DevboxUpdateMode.OnResume)).toBe('On resume')
    expect(updateModeLabel(null)).toBe('On resume')
  })
})
