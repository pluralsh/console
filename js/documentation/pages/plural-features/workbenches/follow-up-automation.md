---
title: Automating workbench follow-up
description: Send a follow-up prompt after a pull request merges, deployment completes, and GitOps reconciliation settles
---

## Overview

Follow-up automation lets the workbench associated with a pull request verify changes after they merge, build, and deploy. The workbench can inspect the live system and infrastructure state, then report or fix issues that are only visible after deployment.

The automation method depends on your source control and CI provider. The following section documents GitHub Actions.

## GitHub Actions

The [Plural Workbench Follow-up Action](https://github.com/pluralsh/workbench-followup-action) sends a follow-up prompt to the workbench job associated with a merged pull request. It wraps the `plural workbenches pr-followup` command.

{% callout severity="info" %}
Run the action only for merged pull requests. The action does not check the pull request state itself.
{% /callout %}

### Requirements

The workflow requires:

* A GitHub Actions runner with Bash, Git, and `jq`
* `pluralsh/setup-plural@v2` run earlier in the same job with Plural CLI version `0.12.60` or newer
* Access to the target Plural Console through federated credentials or a Console token
* A workbench job associated with the pull request

### Configure the workflow

A common pattern is to run the follow-up after the same workflow builds the image, deploys the application, and then gives GitOps reconciliation time to settle before asking the workbench to verify the live result:

```yaml
name: Build, deploy, and verify merged changes

on:
  pull_request:
    types: [closed]

permissions:
  contents: read
  id-token: write

jobs:
  deploy-and-follow-up:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t ghcr.io/acme/example:${{ github.sha }} .
          docker push ghcr.io/acme/example:${{ github.sha }}

      - name: Deploy application
        run: ./scripts/deploy.sh ghcr.io/acme/example:${{ github.sha }}

      - name: Set up Plural
        uses: pluralsh/setup-plural@v2
        with:
          consoleUrl: ${{ vars.PLURAL_CONSOLE_URL }}
          email: ${{ vars.PLURAL_CONSOLE_EMAIL }}
          vsn: 0.12.60

      - name: Verify deployed changes
        id: follow-up
        uses: pluralsh/workbench-followup-action@v1
        with:
          prompt: |
            Pull request #${{ github.event.pull_request.number }} was merged into ${{ github.event.pull_request.base.ref }}.
            The Docker image was built and the application was deployed.
            Verify the live deployment, confirm the expected change is working, and fix any issues you find.
          url: ${{ github.event.pull_request.html_url }}
          defer: 5m
          skip-missing: true

      - name: Print Workbench job
        if: steps.follow-up.outputs.skipped != 'true'
        run: echo '${{ steps.follow-up.outputs.workbench-job-url }}'
```

Replace the example build and deploy commands with your own pipeline steps. Adjust `defer` to match the time your deployment normally needs to finish reconciling. `skip-missing: true` lets the workflow succeed when the pull request is not associated with a workbench job.

When `url` and `commit` are omitted, the action uses `github.event.pull_request.html_url`, so the explicit `url` input above is optional for a `pull_request` workflow.

### Authentication

`pluralsh/setup-plural` installs the selected CLI version and exports `PLURAL_CONSOLE_URL` and `PLURAL_CONSOLE_TOKEN` to subsequent steps in the job. Configure it with one of the following authentication methods.

#### Federated credentials

Use `consoleUrl` and `email` with a matching Plural federated credential. The workflow must grant `id-token: write` so `setup-plural` can exchange the GitHub OIDC token for a Console access token:

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - name: Set up Plural
    uses: pluralsh/setup-plural@v2
    with:
      consoleUrl: ${{ vars.PLURAL_CONSOLE_URL }}
      email: ${{ vars.PLURAL_CONSOLE_EMAIL }}
      vsn: 0.12.60
```

#### Console token

Alternatively, store a Console token as a GitHub Actions secret. This method does not require the OIDC permission:

```yaml
permissions:
  contents: read

steps:
  - name: Set up Plural
    uses: pluralsh/setup-plural@v2
    with:
      consoleUrl: ${{ vars.PLURAL_CONSOLE_URL }}
      consoleToken: ${{ secrets.PLURAL_CONSOLE_TOKEN }}
      vsn: 0.12.60
```

The follow-up action reads authentication from the environment and does not accept the Console URL or token as inputs.

### Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `prompt` | Yes | — | Follow-up prompt sent to the workbench. |
| `url` | No | Event PR URL | Explicit merged pull request URL. When omitted without `commit`, the action uses `github.event.pull_request.html_url`. |
| `commit` | No | `HEAD` | Commit or ref whose subject identifies the pull request when the URL is omitted. |
| `base-url` | No | Origin web URL | Repository web URL used to construct the pull request URL. |
| `provider` | No | `auto` | Source control provider: `auto`, `github`, `gitlab`, or `bitbucket`. |
| `defer` | No | `0s` | Duration to defer the follow-up, such as `30s`, `5m`, or `2h`. |
| `output` | No | `json` | CLI output format: `raw` or `json`. Structured action outputs are available only with `json`. |
| `skip-missing` | No | `false` | Exit successfully if no workbench job is associated with the pull request. |

`url` and `commit` are mutually exclusive.

### Outputs

| Output | Description |
|---|---|
| `prompt-id` | ID of the created follow-up prompt. Empty when skipped. |
| `pull-request-url` | Pull request URL used by the command. |
| `workbench-job-url` | URL of the associated workbench job. Empty when skipped. |
| `skipped` | `true` when no associated workbench job was found and `skip-missing` was enabled. |

The action populates structured outputs only when `output` is `json`. With `output: raw`, it writes the human-readable CLI result to the workflow log and leaves these outputs empty.

### Resolve a pull request from a commit

For a workflow triggered by a push to the deployment branch, the action can infer the pull request from the checked-out commit subject. Check out the repository with full history first:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- name: Verify merged changes
  uses: pluralsh/workbench-followup-action@v1
  with:
    prompt: Verify the merged changes against the reconciled system and infrastructure state.
    commit: HEAD
    provider: github
```

Use `base-url` with `provider` if the Git remote does not provide the correct repository web URL, such as for a self-hosted source control provider.
