# Linear webhook setup for Plural

Plural receives Linear events at a dedicated HTTPS URL and verifies each request using the same **signing secret** Linear uses for the `Linear-Signature` header (HMAC-SHA256 over the raw body). The secret must match exactly in both products. For background, see [Linear: Webhooks](https://linear.app/developers/webhooks) and [Securing webhooks](https://linear.app/developers/webhooks#securing-webhooks).

Recommended order: create the webhook in Linear first with a **placeholder** URL so Linear generates a signing secret, create the Plural webhook with that secret, then point Linear at Plural’s real URL.

## 1. Create the webhook in Linear (placeholder URL) and copy the signing secret

**Who can do this:** Only [workspace admins](https://linear.app/developers/webhooks) (or an OAuth app with `admin` scope) can create or read webhooks.

**Navigation:**

1. Open Linear and go to **Settings**.  
2. Open **API** ([linear.app/settings/api](https://linear.app/settings/api)).  
3. In the webhooks section, choose **New webhook**.  
4. Set **URL** to any **temporary placeholder** you control or a dummy HTTPS URL (for example a request bin or `https://example.com`—you will replace this in step 3). Linear requires a URL to create the webhook; deliveries to the placeholder may fail until you update the URL.  
5. Set a **Label** and choose scope: **all public teams** or a **single team**.  
6. Subscribe to the **resource types** you need. For ticketing automation in Plural, enable at least **Issue**; add **Comment**, **Issue labels**, **Project**, or others if your workflows need them.  
7. Save the webhook.

**Copy the signing secret:**

1. Open that webhook’s **detail** page in Linear.  
2. Copy the **signing secret** shown there (Linear uses it for `Linear-Signature` on each delivery). Store it securely.

## 2. Create the webhook in Plural with that signing secret

In the Plural workbench **Create webhook** flow:

1. **Type of webhook**: Ticketing  
2. **Provider type**: LINEAR  
3. **Name**: A label you will recognize (for example `Linear production`).  
4. **Secret**: Paste the **signing secret** you copied from Linear in step 1. It must match exactly—Plural verifies Linear’s HMAC with this value.

Click **Create new webhook**. Plural then shows:

- **Webhook URL** — your real endpoint; copy it for step 3.  
- **Secret** — confirmation of what you entered (same as Linear’s signing secret).

Use **Attach Your Webhook** when you are ready to continue in the trigger flow.

## 3. Update the Linear webhook to use Plural’s URL

1. Return to Linear **Settings** → **API** and open the webhook you created in step 1.  
2. **Edit** the webhook **URL** and replace the placeholder with the **Webhook URL** from Plural (step 2).  
3. Save. Linear will send deliveries to Plural; signatures will verify because the signing secret already matches.

## 4. Verify end-to-end

1. Create or update an issue (or change state) in a team covered by the webhook.  
2. In Plural, confirm the request is accepted and events appear as expected for your triggers.  
3. If deliveries fail, confirm the endpoint returns **HTTP 200** within Linear’s timeout, and that **no** proxy rewrites the body (signature verification uses the **raw** body).

## 5. Maintenance

- Document owners and rotation in your runbook.  
- Rotating the secret in Linear requires updating the same value in Plural (or recreating both sides in a coordinated way).  
- Failed deliveries may be retried and persistent failures can disable the webhook in Linear until you re-enable it manually.
