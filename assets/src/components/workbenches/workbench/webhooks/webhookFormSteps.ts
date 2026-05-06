import {
  GearTrainIcon,
  ShieldOutlineIcon,
  StepperSteps,
} from '@pluralsh/design-system'

export const WEBHOOK_ACCESS_FORM_STEPS = [
  {
    key: 'setup',
    stepTitle: 'Webhook setup',
    IconComponent: GearTrainIcon,
  },
  {
    key: 'access-policy',
    stepTitle: 'Access policy',
    IconComponent: ShieldOutlineIcon,
  },
] as const satisfies StepperSteps

export type WebhookAccessFormStep =
  (typeof WEBHOOK_ACCESS_FORM_STEPS)[number]['key']
