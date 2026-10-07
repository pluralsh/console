# ServiceNow Webhook Setup for Plural

ServiceNow has no built-in outbound webhook, so you send ticket changes to
Plural from a Business Rule. Plural accepts records from the `incident`,
`change_request`, `problem` and `sc_task` tables and ignores anything else.

## 1. Create the webhook in Plural

1. Set **Type** to `Ticketing`.
2. Set **Provider** to `ServiceNow`.
3. Enter a **Name**.
4. Generate or paste a **Secret**.
5. Click **Create new webhook** and copy the webhook URL.

## 2. Store the secret in ServiceNow

Open **System Properties** (`sys_properties.list`) and create a string
property, for example `plural.webhook.secret`, holding the secret. Restrict
its read roles to admins.

## 3. Create a Business Rule

Open **System Definition → Business Rules** and create a rule for each table
you want to send:

- **Table:** `Incident` (repeat for Change Request, Problem, Catalog Task)
- **Advanced:** checked
- **When:** `async`
- **Insert** and **Update:** checked

Script, with the secret sent in a header:

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

### Optional: sign the body instead

To avoid sending the secret itself, send an HMAC-SHA256 of the request body in
`x-plural-signature` and drop the `x-plural-webhook-secret` header. Plural
accepts hex or base64 signatures. If `x-plural-signature` is present it must be
valid; Plural does not fall back to the shared secret.

Replace the header lines in the script above with:

```javascript
  var payload = JSON.stringify(body);
  var key = GlideStringUtil.base64Encode(gs.getProperty('plural.webhook.secret'));
  var signature = new GlideCertificateEncryption().generateMac(key, 'HmacSHA256', payload);

  request.setRequestHeader('x-plural-signature', signature);
  request.setRequestBody(payload);
```

Test this on a non-production instance first. If Plural answers 403, check
that `generateMac` signs the raw payload on your release.

## 4. Validate

Update a ticket in one of the tables and confirm in Plural that the issue
appears with the right title and status.

Status mapping uses the base system state values for each table. Custom states
are mapped from their label (for example "In Progress", "Resolved",
"Canceled"); anything unrecognised is treated as open.

Plural does not check timestamps, so a captured request could be replayed.
Rotate the secret if you suspect it leaked.
