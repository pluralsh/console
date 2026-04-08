# Plural-to-Plural Webhook Setup

Generate markdown documentation for creating a webhook in Plural against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts and internal event streams.

## 1. Create the receiving webhook in target Plural

In the target Plural environment create:

- Type: Observability
- Provider: PLURAL
- Secret: shared secret

Copy the receiving URL.

## 2. Register destination URL and secret in source Plural

In the source Plural environment configure outbound webhook destination:

- URL: target Plural webhook URL
- Secret: same secret as target receiver

This ensures the receiving environment can validate authenticity.

## 3. Configure source triggers

Enable event routing for the signals you want to federate:

- alert raised
- alert resolved
- workflow or policy events relevant to operations

Apply project/environment filters to avoid duplicate or noisy events.

## 4. Validate

Send a controlled test event from source Plural and verify target Plural:

- receives event
- validates secret
- records event under webhook activity
