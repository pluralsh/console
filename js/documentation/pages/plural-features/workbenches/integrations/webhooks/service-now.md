---
title: ServiceNow
description: Receive ServiceNow ticket events in Plural
---

A ServiceNow webhook delivers ticket changes from ServiceNow into Plural. ServiceNow has no built-in outbound webhook, so you send records from a Business Rule. Plural accepts records from four tables: incidents (`incident`), change requests (`change_request`), problems (`problem`), and catalog tasks (`sc_task`). Records from other tables are acknowledged and ignored.

A ticket event does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the ticket.

## What Plural reads from the payload

The Business Rule posts the record as JSON:

```json
{
  "table": "incident",
  "instance_url": "https://example.service-now.com/",
  "sys_id": "0123456789abcdef0123456789abcdef",
  "number": "INC0010001",
  "short_description": "Checkout is down",
  "description": "500s from the payments service",
  "state": { "value": "2", "display_value": "In Progress" }
}
```

* `table` (or `sys_class_name`) picks the table. It is required.
* `number` becomes the issue ID, falling back to `sys_id`.
* `short_description` and `description` become the issue title and body.
* `instance_url`, `table`, and `sys_id` build the link back to the ticket. You can send a `url` field instead.
* `state` sets the issue status. Any field can be a plain value or a `{value, display_value}` pair, and the payload can be wrapped in `{"result": {...}}` as the Table API returns it.

Base system state values map as follows. Custom states are mapped from their label, such as "In Progress", "Resolved", or "Canceled". Anything unrecognized is treated as open.

| Table | Open | In progress | Completed | Cancelled |
|---|---|---|---|---|
| `incident` | 1 New, 3 On Hold | 2 In Progress | 6 Resolved, 7 Closed | 8 Canceled |
| `problem` | 101 New | 102–105 | 106 Resolved, 107 Closed | |
| `change_request` | -5 New | -4 Assess to 0 Review | 3 Closed | 4 Canceled |
| `sc_task` | 1 Open, -5 Pending | 2 Work in Progress | 3 Closed Complete | 4 Closed Incomplete, 7 Closed Skipped |

## Authentication

Plural accepts either of two headers:

* `x-plural-webhook-secret`: the webhook secret itself.
* `x-plural-signature`: an HMAC-SHA256 of the raw request body keyed with the webhook secret, hex or base64 encoded.

If `x-plural-signature` is present it must be valid. Plural does not fall back to the shared secret. Requests with neither header are rejected with 403.

Business Rules can't compute an HMAC easily, so most setups send the secret header. That is safe only over HTTPS. Never use a plain `http://` endpoint, and rotate the secret if it may have leaked, since it travels with every request.

Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **Four tables only.** Records from any other table are acknowledged and ignored.
* **Links must be http(s).** A `url` or `instance_url` with any other scheme is dropped, and the issue is created without a link.
* **Custom states map by label.** Send `state` as a `{value, display_value}` pair. A custom label that Plural does not recognize shows the ticket as open.
* **Tickets without a matching trigger are dropped.** If no workbench trigger matches the ticket title and description, Plural does not store the ticket and the request answers `{"ignored": true}` with status 200. The same answer comes back for records from other tables and for payloads Plural cannot read.
* **Delivery is one-shot.** `executeAsync` does not retry, so a failed request is not redelivered. Use a scheduled job in ServiceNow if you need reconciliation.
* **No deletes.** A deleted ticket is not removed from Plural.

## Set up the webhook

### Create the webhook in Plural

1. In Plural Console, create a webhook with **Type** `Ticketing` and **Provider** `ServiceNow`.
2. Enter a name and generate or paste a secret.
3. Create the webhook and copy its URL.

### Store the secret in ServiceNow

Open **System Properties** (`sys_properties.list`) and create a string property, for example `plural.webhook.secret`, that holds the secret. Restrict its read roles to admins.

### Create a Business Rule

Open **System Definition → Business Rules** and create a rule for each table you want to send. Set **Advanced**, run it `async`, and check **Insert** and **Update**.

```javascript
(function executeRule(current, previous) {
  var body = {
    table: current.getTableName(),
    instance_url: gs.getProperty('glide.servlet.uri'),
    sys_id: current.getUniqueValue(),
    number: current.getValue('number'),
    short_description: current.getValue('short_description'),
    description: current.getValue('description'),
    state: {
      value: current.getValue('state'),
      display_value: current.getDisplayValue('state')
    }
  };

  var request = new sn_ws.RESTMessageV2();
  request.setEndpoint('<PLURAL_WEBHOOK_URL>');
  request.setHttpMethod('post');
  request.setRequestHeader('Content-Type', 'application/json');
  request.setRequestHeader('x-plural-webhook-secret', gs.getProperty('plural.webhook.secret'));
  request.setRequestBody(JSON.stringify(body));
  request.executeAsync();
})(current, previous);
```

To sign the body instead of sending the secret, replace the secret header and request body lines with:

```javascript
  var payload = JSON.stringify(body);
  var key = GlideStringUtil.base64Encode(gs.getProperty('plural.webhook.secret'));
  var signature = new GlideCertificateEncryption().generateMac(key, 'HmacSHA256', payload);

  request.setRequestHeader('x-plural-signature', signature);
  request.setRequestBody(payload);
```

Try the signing script on a non-production instance first.

## Troubleshooting

* **403 Forbidden**: the secret does not match, the signature is wrong, or neither header was sent. If you use `x-plural-signature`, the body you sign must be exactly the body you send.
* **`{"ignored": true}`**: the record is from a table other than the four above, or `table` and `sys_class_name` are both missing.
* **Wrong status**: the instance uses custom state values. Send `state` as a `{value, display_value}` pair so Plural can map the label.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [ServiceNow tool](/plural-features/workbenches/integrations/tools/service-now)
