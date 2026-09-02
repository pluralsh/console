---
title: PR automation testing
description: Tools and strategies for testing your PR automations
---

Testing template code is always a bit of a challenge.  In the case of a Plural PR automation, you can always experiment using our UI, but if you need more thorough QA we provide two testing strategies:

* local execution with `plural pr test`
* contract testing with `plural pr contracts`

Both can be used, the former is nice for lightweight validation of the correctness of your PR automation, the latter provides a robust CI strategy for more complex setups.

## Locally Execute a PR Automation

You can run a pr automation locally at any time with:

```sh
plural pr test --file path/to/pr-automation-cr.yaml
```

It will parse the CRD locally, run a terminal-based wizard for its configuration, and apply the templates using the same codepath executed by the main PR automation api.  No PR will actually be created, but you can see exactly what the templates will do, and confirm it works as expected.

## Contract Testing a PR Automation

Contract testing is a test strategy which takes the output of a set of APIs against expected inputs, renders it locally into your source control, and succeeds only if there are no differences created.  This provides a clear way to know if a prior contract was violated by showing the drift created, and integrates seamlessly into a code review + CI process, since you can execute it in your CI solution and view the changes in a PR diff.

The `plural` CLI has a command that easily wraps this approach with a single declarative file.  You'll create yaml file like this, say in a file named `test/contracts.yaml`:

```yaml
apiVersion: platform.plural.sh/v1alpha1
kind: PrContracts
metadata:
  name: workspaces
spec:
  workdir: outputs # where to execute pr automations, useful if you want to run inside a test folder
  automations:
  - file: path/to/pr-automation.yaml
    context: ../contexts/pr-automation-context.yaml # yaml file representing the configuration input for this automation
  - file: path/to/other-automation.yaml
    context: ../contexts/other-automation-context.yaml
  - file: path/to/external-automation.yaml
    context: ../contexts/pr-automation-context.yaml
    externalDir: other-templates # if you're using a PR automation sourcing templates from an external git reference, you need to configure an `externalDir` pointing to the templates it would have pulled in.
```

If you want to wrap this all up into a script executable by your CI, you can imitate this [Justfile](https://just.systems/man/en/)

```make
contracts:
  cd test && plural pr contracts --file contracts.yaml

test: contracts
  if [[ `git status --porcelain` ]]; then \
    echo "local git changes detected, failing contract test"; \
    git --no-pager diff; \
    exit 1; \
  fi
```