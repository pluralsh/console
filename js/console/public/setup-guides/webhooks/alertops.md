# AlertOps Webhook Setup for Plural

References:
- [AlertOps - Outbound Overview](https://help.alertops.com/knowledge-base/outbound-overview)
- [AlertOps - Custom API Integration](https://help.alertops.com/knowledge-base/custom-api-integration)
- [AlertOps - Advanced Field Mapping](https://help.alertops.com/knowledge-base/advanced-field-mapping)

AlertOps outbound webhook payloads are user-configurable in the Outbound Integration template. Plural keys off the standard `Incident*` field names and looks for `plrl_project`, `plrl_cluster`, and `plrl_service` keys to associate alerts with the correct resources.

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Observability`.
2. Set **Provider** to `ALERTOPS`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Copy the generated Plural webhook URL.

## 2. Create the outbound integration in AlertOps

In your AlertOps account (`https://app.alertops.com/`):

1. Go to **Configuration** -> **Integrations** -> **Outbound Integration** -> **Add Outbound Integration**
2. Set **Service Name** to something recognizable (e.g. `Plural`)
3. Set **Web Security Type** to **Basic**
   - **UserName**: any non-empty value (e.g. `plrl`)
   - **Password**: the Plural **Signing secret** from step 1
4. Click **Save**

## 3. Add a method that POSTs to Plural

On the new outbound integration:

1. Click **Add Method**
2. Set **Method Name** to `Plural Create Alert`
3. Set **Service Type** to `REST`
4. Set **Template Type** to `Standard Alert`
5. Paste the Plural webhook URL into **URI**
6. Set **Content Type** to `JSON`
7. Set **Web Method** to `POST`
8. Set **Request Data** to the Standard Alert template plus the Plural association keys. For example:

   ```json
   {
     "IncidentId": "<IncidentId>",
     "IncidentSubject": "<IncidentSubject>",
     "IncidentStatus": "<IncidentStatus>",
     "IncidentSeverity": "<IncidentSeverity>",
     "IncidentURL": "<IncidentURL>",
     "IncidentShortText": "<IncidentShortText>",
     "IncidentLongText": "<IncidentLongText>",
     "plrl_project": "<your-plural-project>",
     "plrl_cluster": "<your-plural-cluster>",
     "plrl_service": "<your-plural-service>"
   }
   ```

   Replace the `plrl_*` values with the matching Plural project name, cluster handle, and `cluster-handle/service-name` reference. If you cannot inject them as top-level keys, embed `Plural Cluster: <handle>` / `Plural Service: <handle>/<name>` markers in `IncidentLongText` and Plural will scrape them as a fallback.

## 4. Attach the method to a workflow

So that AlertOps fires the method on both firing and resolved transitions:

1. Go to **Configuration** -> **Workflows** -> **Add Workflow**
2. Add an **Action** -> **Outbound Service Notification** that targets the `Plural Create Alert` method
3. Trigger it on **Alert Created**, **Alert Updated**, and **Alert Closed** events (`IncidentStatus` values of `OK`, `CLOSED`, or `RESOLVED` are treated as resolved by Plural; everything else is treated as firing)
4. Attach the workflow to the relevant Escalation Policy

## 5. Validate

Trigger a test alert in AlertOps and confirm in Plural:

- request accepted
- Basic auth validated
- alert appears with the correct cluster / service / project association
- a follow-up close event flips the alert to resolved
