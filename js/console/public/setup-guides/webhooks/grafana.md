# Grafana Webhook Setup for Plural

Reference: [Grafana - Configure the webhook notifier](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Observability`.
2. Set **Provider** to `GRAFANA`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Plural shows the webhook URL only after creation. Copy it.

## 2. Create a webhook contact point in your Grafana

Open your Grafana base URL (for example `https://<your-grafana-host>/`):

1. **Alerts & IRM** -> **Alerting** -> **Contact points**
2. **+ Add contact point**
3. **Integration** = `Webhook`
4. **URL** = Plural webhook URL
5. Enable **HTTP Basic Authentication**
   - username: any non-empty value
   - password: the same signing secret from Plural

Use Basic Auth only (do not combine with another Authorization header).

## 3. Route alerts

Attach the contact point via notification policies for:

- firing alerts
- resolved alerts

Filter by labels/folders/matchers to keep signal quality high.

## 4. Validate

Use Grafana test notification and a real test alert. Confirm in Plural:

- request accepted
- basic auth password verified
- both firing and resolved events are ingested
