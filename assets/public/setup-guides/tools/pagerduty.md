# PagerDuty tool setup

Workbench’s PagerDuty integration calls the **PagerDuty REST API** (`https://api.pagerduty.com`) with a **REST API key**. The backend sends it as `Authorization: Token token=<api_key>`.

Use this when webhook payloads lack incident context (for example `body.details`, notes, or trigger log entry channel details). Agents can fetch that data on demand.

## 1) Create a REST API key

1. In PagerDuty, go to **Integrations → API Access Keys → Create New API Key**.
2. Enter a description and choose read-only if you only need incident lookup.
3. Copy the key immediately — PagerDuty will not show it again.

The key needs permission to read incidents for the services you care about (typically a read-only account or user key is enough).

## 2) Built-in tools

| Built-in tool (name suffix) | PagerDuty API | Purpose |
|-----------------------------|---------------|---------|
| `pagerduty_get_incident_*` | [`GET /incidents/{id}`](https://developer.pagerduty.com/api-reference/367602b1c2e48-get-an-incident) | Full incident record including `body.details` (UI description) |
| `pagerduty_list_incidents_*` | [`GET /incidents`](https://developer.pagerduty.com/api-reference/9d0b0b12e36f9-list-incidents) | Search/filter open or recent incidents |
| `pagerduty_list_incident_notes_*` | [`GET /incidents/{id}/notes`](https://developer.pagerduty.com/api-reference/988fd8460f5f0-list-notes-for-an-incident) | Responder notes |
| `pagerduty_list_incident_log_entries_*` | [`GET /incidents/{id}/log_entries`](https://developer.pagerduty.com/api-reference/3679cad205ac9-list-log-entries-for-an-incident) | Timeline entries; triggers may include `channel.details` |

Pass the incident **id** from webhook payloads (`event.data.id`) or the numeric **incident number** shown in the PagerDuty UI.

## 3) Fill the Workbench tool form

- **API token**: paste the REST API key from step 1.

After saving, associate this tool with a workbench that handles PagerDuty alert workflows.

## Further reading

- [PagerDuty REST API overview](https://developer.pagerduty.com/docs/rest-api-v2/rest-api/)
- [PagerDuty API authentication](https://developer.pagerduty.com/docs/rest-api-v2/authentication/)
- [PagerDuty webhooks (V3)](https://support.pagerduty.com/docs/webhooks)
