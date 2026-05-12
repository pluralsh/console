# Plural-to-Plural Webhook Setup

Use this flow when one Plural environment sends observability webhook events to another Plural environment.

## 1. Create the receiving webhook in target Plural

In the target Plural environment:

1. Open webhook creation.
2. Set **Type** to `Observability`.
3. Set **Provider** to `PLURAL`.
4. Enter a user-chosen **Name**.
5. Enter a strong **Signing secret**.
6. Click **Create new webhook**.

After creation, Plural generates and shows the receiving **Webhook URL**. Copy it.

## 2. Configure outbound webhook in source Plural

In the source Plural environment, create the outbound webhook/contact point:

- **Destination URL:** the target Plural webhook URL from step 1
- **Authentication:** HTTP Basic Auth
- **Password:** the same signing secret from step 1
- **Username:** any non-empty value

Plural validates requests using the Basic Auth password.

## 3. Route events

Enable source routing for the events you want to federate:

- alert firing/opened
- alert resolved/closed
- other internal observability events required by your team

Use environment/project filters to avoid duplicate or noisy forwarding.

## 4. Validate

Trigger a controlled test alert in the source environment and confirm in target Plural:

- request is accepted
- auth validation succeeds
- event appears in webhook activity/history
