import { GateState, GateType, PipelineGateFragment } from 'generated/graphql'

export const FAKE_GATES: Partial<PipelineGateFragment>[] = [
  {
    id: '1',
    name: 'An approval',
    type: GateType.Approval,
    state: GateState.Open,
    approver: {
      id: '1',
      name: 'Chris Klink',
      profile:
        'https://plural-assets.s3.us-east-2.amazonaws.com/uploads/avatars/c7aebf7f-1c0e-46db-ad5c-e2e233652a28/Screen%20Shot%202022-07-27%20at%208.53.09%20PM.png?v=63826675838',
      email: 'klink@plural.sh',
    },
  },
  {
    id: '2',
    name: 'An approval',
    type: GateType.Approval,
    state: GateState.Pending,
    approver: {
      id: '2',
      name: 'Michael Guarino',
      profile: '',
      email: 'mjg@plural.sh',
    },
  },
  {
    id: '3',
    name: 'An approval',
    type: GateType.Approval,
    state: GateState.Closed,
    approver: {
      id: '3',
      name: 'Samantha Bolian',
      profile: '',
      email: 'samb@plural.sh',
    },
  },
  {
    id: '4',
    name: 'approval',
    type: GateType.Approval,
    state: GateState.Closed,
  },
  {
    id: '10',
    name: 'Delivery window',
    type: GateType.Window,
    state: GateState.Closed,
  },
  {
    id: '20',
    name: 'Code scan job',
    type: GateType.Job,
    state: GateState.Open,
  },
  {
    id: '20',
    name: 'Datadog Monitors',
    type: GateType.Job,
    state: GateState.Pending,
  },
  {
    id: '20',
    name: 'Integration tests',
    type: GateType.Job,
    state: GateState.Open,
  },
]
