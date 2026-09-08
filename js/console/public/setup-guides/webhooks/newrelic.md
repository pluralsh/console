# New Relic Webhook Setup for Plural

References:
- [New Relic - Destinations](https://docs.newrelic.com/docs/alerts/get-notified/destinations/)
- [New Relic - Notifications and alert destinations](https://docs.newrelic.com/docs/workflow-automation/setup-and-configure/create-destinations/)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Observability`.
2. Set **Provider** to `NEWRELIC`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Copy the generated Plural webhook URL.

## 2. Create webhook destination in New Relic

In your New Relic account (`https://one.newrelic.com/` or your mapped account URL):

1. Go to notification **Destinations**
2. Create a **Webhook** destination
3. Set the destination URL to the Plural webhook URL
4. Configure authentication headers

For Plural verification, use HTTP Basic Auth where possible:

- username: any non-empty value
- password: Plural signing secret

If your New Relic workflow uses custom headers instead, store credentials in New Relic secrets and map them consistently.

## 3. Attach destination to workflows

Route incident lifecycle signals:

- activated/open incidents
- acknowledged incidents
- closed incidents

Use policy/account/tag filters to limit noise.

## 4. Validate

Send a test notification and trigger an alert. Confirm in Plural:

- request accepted
- auth validated
- lifecycle events appear correctly
