# Grafana Webhook Setup for Plural

Connect Grafana Alerting to Plural by creating an observability webhook in Plural, then adding a **Webhook** contact point in **your** Grafana instance. Grafana sends JSON alert payloads; Plural authenticates the request with **HTTP Basic Authentication** (the password must match the signing secret you chose in Plural).

Official reference for the webhook integration: [Configure the webhook notifier for Alerting](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/).

## 1. Create the webhook in Plural

In the workbench webhook flow, configure:

- **Type:** Observability  
- **Provider:** Grafana  
- **Name:** a label you will recognize (for example `Production Grafana`)  
- **Secret:** a strong signing secret you generate and store safely  

Plural persists the secret and, **after you save**, shows the **webhook URL** and repeats the secret. Copy the URL from Plural—you cannot configure Grafana until that URL exists.

The secret is sent as the **Basic Auth password** on each request; Plural verifies that password against the stored secret.

## 2. Add a Webhook contact point in Grafana

Open Grafana in the browser using **your** deployment’s base URL, for example `https://<your-grafana-host>/` (Grafana Cloud, self-managed, or behind your SSO—all use the same alerting UI paths relative to that host).

1. Go to **Alerts & IRM** → **Alerting** → **Contact points**.  
2. Click **+ Add contact point**.  
3. Enter a **name** for this contact point (Grafana-side label only; it does not need to match Plural).  
4. Under **Integration**, choose **Webhook**.  
5. **URL:** paste the Plural webhook URL from step 1.  
6. Expand optional settings and set **HTTP Basic Authentication**:  
   - **Username:** any non-empty value (Plural only checks the password; `plrl` is a reasonable default).  
   - **Password:** the **same** signing secret you entered in Plural.  

Do **not** enable Grafana’s **HMAC Signature** option for this integration—Plural expects Basic Auth verification, not Grafana’s HMAC headers. Per Grafana, you cannot combine Basic Authentication with a separate **Authorization** header on the same contact point; use Basic Auth only.

Leave **HTTP method** as **POST** unless your environment requires otherwise (Plural expects a JSON body).

## 3. Route alerts to the contact point

Use **Notification policies** (still under **Alerting**) to send firing and resolved notifications to this contact point:

- Include routes for **firing** and **resolved** alerts where you want Plural to see lifecycle changes.  
- Prefer labels, folders, or matchers so only high-signal, incident-relevant rules notify Plural—this cuts noise and duplicate events.

Grafana’s default webhook payload includes `alerts`, `status`, labels, and annotations; Plural parses the standard Grafana alerting webhook shape.

## 4. Validate the integration

1. In the contact point editor, use Grafana’s **Test** notification (or trigger a controlled test alert).  
2. In Plural, confirm the request is accepted and alerts appear as expected for both **firing** and **resolved** paths.

If requests fail with **403 Forbidden**, recheck Basic Auth: password must exactly match the Plural secret, and the URL must be the one Plural issued for that webhook.
