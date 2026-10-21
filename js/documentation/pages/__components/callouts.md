---
title: Callouts
---

## Full size kitchen sink

{% comment %}
This shouldn't be visible
{% /comment %}

{% callout severity="info" title="This is an info callout" %}
Things like [inline links](#), `code highlights`, [`linked code highlights`](#) and _other_ text **styles** should be **_supported_**. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

- List item 1
- List item 2

{% cta title="Let's go to Google" href="http://google.com" /%}

{% /callout %}

{% callout severity="warning" title="This is a warning callout" %}
Things like [inline links](#), `code highlights`, [`linked code highlights`](#) and _other_ text **styles** should be **_supported_**. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

- List item 1
- List item 2

{% cta title="Let's go home" href="/" /%}

{% /callout %}

{% callout severity="danger" title="This is a danger callout" %}
Things like [inline links](#), `code highlights`, [`linked code highlights`](#) and _other_ text **styles** should be **_supported_**. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

- List item 1
- List item 2

{% cta title="Let's go to Debugging" href="/debugging" /%}

{% /callout %}

{% callout severity="tip" title="This is a tip callout" %}
Things like [inline links](#), `code highlights`, [`linked code highlights`](#) and _other_ text **styles** should be **_supported_**. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

- List item 1
- List item 2

{% cta title="Let's go to Google" href="http://google.com" /%}

{% /callout %}

{% callout severity="beta" title="This is a beta callout" %}
Things like [inline links](#), `code highlights`, [`linked code highlights`](#) and _other_ text **styles** should be **_supported_**. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

- List item 1
- List item 2

{% /callout %}

## Full size

{% callout severity="info" %}
Cron expressions use UTC. The UI previews upcoming fire times in your local timezone so you can check the schedule.
{% /callout %}

{% callout severity="tip" %}
Start a schedule from a job you already ran manually. It keeps the same prompt and context.
{% /callout %}

{% callout severity="warning" %}
Jobs run as the selected user, with that user's permissions and credentials.
{% /callout %}

{% callout severity="danger" %}
Deleting a workbench cancels every scheduled and webhook-triggered job attached to it.
{% /callout %}

{% callout severity="beta" %}
Flow-triggered jobs are in beta. Behavior may change before general availability.
{% /callout %}

## Compact size

{% callout severity="info" size="compact" %}
Should support things like [inline links](#).
{% /callout %}

{% callout severity="warning" size="compact" %}
Should support things like `code highlights`.
{% /callout %}

{% callout severity="danger" size="compact" %}
Should support things like [`linked code highlights`](#).
{% /callout %}

{% callout severity="success" size="compact" %}
Should support things like _italic text_, **bold text** or **_bold italic text_**.
{% /callout %}
