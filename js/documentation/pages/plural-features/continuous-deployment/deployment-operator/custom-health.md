---
title: CustomHealth Lua authoring
description: Define CustomHealth Lua scripts for a target Kubernetes GVK
---

`CustomHealth` is an exact-GVK health override used by the deployment operator. Write one when you need to define health for a particular Kubernetes group, version, and kind.

`CustomHealth` is a deployment-operator API, so apply it to each cluster where it should be used. To distribute the same resource across a fleet, use a [GlobalService](/plural-features/continuous-deployment/global-service).

Here's an example manifest:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: CustomHealth
metadata:
  name: example-ready-condition
spec:
  group: example.io
  version: v1
  kind: Example
  script: |
    healthStatus = { status = "Unknown" }

    if Obj.status ~= nil and statusConditionExists(Obj.status, "Ready") then
      healthStatus = { status = "Progressing" }
      if isStatusConditionTrue(Obj.status, "Ready") then
        healthStatus = { status = "Healthy" }
      end
    end
```

Set `spec.group`, `spec.kind`, and, when needed, the optional `spec.version` to identify the target GVK. Put the Lua code in `spec.script`.

## Script inputs

The script receives a global `Obj`: the unstructured target Kubernetes resource. Read the fields that define health for the target GVK from `Obj`, and guard fields that might be absent.

## Script outputs

Every script sets global `healthStatus` to an object with `status` and, when applicable, `message` fields. The allowed status values are:

- `Healthy`
- `Progressing`
- `Degraded`
- `Suspended`
- `Unknown`
- `Missing`

## Helpers

Use the supported status-condition helpers in `spec.script`:

- `statusConditionExists(Obj.status, "Ready")`
- `isStatusConditionTrue(Obj.status, "Ready")`

The example above uses both helpers to evaluate a `Ready` condition. For resources that use another condition type, replace `"Ready"` with the condition type relevant to that resource.

## Authoring guidance

- Keep each script focused on the fields relevant to its target GVK.
- Guard optional or missing fields before reading them.
- Always assign a fallback `healthStatus`, such as `Unknown` when the resource does not yet contain the fields your script needs.
- Use the status values consistently and make messages actionable when you set `healthStatus.message`.
