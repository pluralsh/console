---
title: Stack PR workflow
description: API-Driven Infrastructure As Code CD
---

Plural Stacks have the ability to trigger dry runs on PR giving users clear information as to what infrastructure can change as a result.  This will do two things:

* run a dry run that terminates at the equivalent of `terraform plan` for the relevant stack type
* post informative messages back to the PR to surface relevant details in Git.

To trigger a PR run, you'll need to follow a few conventions:

* the branch can be named any name like `plrl/stacks/<stack-name>/.*`
* You include text like `Plural Stack: <stack-name>` in the title or description of the PR

This will tie the PR to the stack and initiate the dry-run process.

## Dependencies

There are a few dependencies to getting these working:

* You need to configure a SCM connection to whatever source control provider you're using.  We currently support Github and Gitlab, and are happy to support others on request as well.
* You need to configure a webhook against that SCM as well.

Both can be done in the ui.

Finally, you need to configure your stacks to use a given SCM connection, that can be done globally with:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ScmConnection
metadata:
  name: github
spec:
  name: <name-from-ui>
  type: GITHUB
---
apiVersion: deployments.plural.sh/v1alpha1
kind: DeploymentSettings
metadata:
  name: global
spec:
  stacks:
    connectionRef:
      name: github
```