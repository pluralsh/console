# PagerDuty Webhook Setup for Plural

Reference: [PagerDuty - Webhooks](https://support.pagerduty.com/main/docs/webhooks)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Observability`.
2. Set **Provider** to `PAGERDUTY`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Copy the generated webhook URL.

## 2. Create webhook subscription in PagerDuty

In your PagerDuty account (`https://<your-subdomain>.pagerduty.com/`):

1. Open webhook subscriptions (generic or service-scoped)
2. Create a new subscription with HTTP delivery
3. Set destination URL to the Plural webhook URL
4. Select service/team/account filter scope
5. Add auth header or Basic Auth using the Plural signing secret (if your PagerDuty webhook mode supports it)

## 3. Select event types

Enable incident lifecycle events:

- `incident.triggered`
- `incident.acknowledged`
- `incident.resolved`

Include additional incident update events only if needed.

## 4. Validate

Trigger a test incident in PagerDuty and confirm in Plural:

- delivery accepted
- auth/secret verification succeeds
- incident state transitions are visible
