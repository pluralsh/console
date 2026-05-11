<!-- Describe your changes here, include the motivation/context, test coverage, -->
<!-- the type of change i.e. breaking change, new feature, or bug fix -->
<!-- and related GitHub issue or screenshots (if applicable). -->

<!-- Adding a meaningful title and description allows us to better communicate -->
<!-- your work with our users. -->

## Test Plan
<!-- Please provide a link to a test environment where you have deployed and tested the agent. -->
Test environment: https://console.your-env.onplural.sh/

<!-- Please describe the tests you have added and preformed. -->

## Checklist
<!-- Go over all the following points to make sure you've checked all that apply before merging. -->
<!-- If you're unsure about any of these, don't hesitate to ask in our Discord. -->

- [ ] I have added a meaningful title and summary to convey the impact of this PR to a user.
- [ ] I have deployed the agent to a test environment and verified that it works as expected.
    - [ ] Agent starts successfully.
    - [ ] Service creation works without any issues when using raw manifests and Helm templates.
    - [ ] Service creation works when resources contain both CRD and CRD instances.
    - [ ] Service templating works correctly.
    - [ ] Service errors are reported properly and visible in the UI.
    - [ ] Service updates are reflected properly in the cluster.
    - [ ] Service resync triggers immediately and works as expected.
    - [ ] Sync waves annotations are respected.
    - [ ] Sync phases annotations are respected. Phases are executed in the correct order.
    - [ ] Sync hook delete policies are respected. Resources are not recreated once they reach the desired state.
    - [ ] Service deletion works and cleanups resources properly.
    - [ ] Services can be recreated after deletion.
    - [ ] Service detachment works and keeps resources unaffected.
    - [ ] Services can be recreated after detachment.
    - [ ] Service component trees are working as expected.
    - [ ] Cluster health statuses are being updated.
    - [ ] Agent logs do not contain any errors (after running for at least 30 minutes).
    - [ ] There are no visible anomalies in Datadog (after running for at least 30 minutes).
- [ ] I have added tests to cover my changes.
- [ ] If required, I have updated the Plural documentation accordingly.

