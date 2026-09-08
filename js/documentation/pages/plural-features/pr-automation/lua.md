---
title: Lua-based Pre-Processing
description: Use Lua for complex Turing-complete PR Automations
---

The standard way PR automations work is deterministic templates defined via YAML. This can go a long way to handling any code generation needed for a large set of repeatable platform engineering tasks, but occasionally you need to go further by:

* generating code contextual on other configuration files in a repo
* add content based error handling
* auto-infer inputs based on complex, custom rules

For all these cases, Plural uses its Lua integration to allow developers to fill the gap with a sandboxed, turing complete programming language interface.

## Configuring a lua-based PR Automation

The simplest example of using a lua based pr automation is below:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrAutomation
metadata:
  name: lua-updater
spec:
  name: lua-updater
  documentation: Updates the console image version
  repositoryRef:
    name: infra
    namespace: infra
  git:
    ref: main
    folder: lua
  lua:
    external: true # sources lua code from the infra/infra GitRepository's main branch in the lua folder. 
    folder: '.'
  scmConnectionRef:
    name: plural
  title: "Updating images to for {{ context.component }}"
  message: "Updating images to for {{ context.component }} to use {{ context.images }}"
  identifier: pluralsh/plrl-up-demos
  configuration:
  - name: component
    type: STRING
    documentation: The component to update
  - name: images
    type: STRING
    documentation: The images to update
```

This will trigger it to use all lua code in the configured folder, this can use all the capabilities in our core lua docs [here](/plural-features/continuous-deployment/lua).  Some example lua code might look like:

```lua
local images, err = encoding.jsonDecode(context.images)
if err then
    error("Failed to decode images: " .. tostring(err))
end

lutFile, err = fs.read("images/lut.yaml")
if err then
    error("Failed to read lut file: " .. tostring(err))
end

lut, err = encoding.yamlDecode(lutFile)
if err then
    error("Failed to decode lut file: " .. tostring(err))
end

overlays = {}

for _, image in ipairs(images) do
    local repo, tag = image:match("^(.-):(.+)$")
    if not repo then
        error("Invalid image: " .. tostring(image))
    end

    if lut[repo] then
        tag = tag:match("([^@]+)")
        if tag then
            local overlayContent = {images = {}}
            overlayContent["images"][lut[repo]] = {version = tag}
            table.insert(overlays, {
                file = "images/registry.yaml",
                yaml = encoding.yamlEncode(overlayContent)
            })
        end
    end
end

if #overlays > 0 then
    prAutomation = {
        updates = {
            yamlOverlays = overlays
        }
    }
end
```

## Lua PR Automation outputs

Lua scripts should generate one of two fields:

* `prAutomation` - this is an overlay on the PrAutomation spec you define in our API.  The pr automation process will deep merge it on the original, adding any additional updates, creates, and deletes.
* `context` - similar to `prAutomation`, any values set in this variable will be merged into the base pr automations context field (usually configuration fields set by the user).  This can be useful for inferring inputs that can reduce human error in filling our your pr automation forms.

