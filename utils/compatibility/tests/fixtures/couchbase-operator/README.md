# Couchbase Operator fixture sources

Retrieved on 2026-09-09 from the official published documentation:

- `2.9.html`: https://docs.couchbase.com/operator/2.9/prerequisite-and-setup.html
- `2.8.html`: https://docs.couchbase.com/operator/2.8/prerequisite-and-setup.html
- `2.7.html`: https://docs.couchbase.com/operator/2.7/prerequisite-and-setup.html
- `2.6.html`: https://docs.couchbase.com/operator/2.6/prerequisite-and-setup.html
- `2.5.html`: https://docs.couchbase.com/operator/2.5/prerequisite-and-setup.html
- `index.yaml`: https://couchbase-partners.github.io/helm-charts/index.yaml

The HTML fixtures retain only the release identifier, version selector and
`table-operator-compatibility` table; surrounding navigation and product prose
are omitted. The Helm fixture retains the application/chart identities and
artifact fields for the 2.4–2.9 families. It includes the older 2.4 entries to
verify that charts absent from the published documentation selector are skipped.

The scraper records the latest stable chart/application pair in each currently
published documentation family (2.5–2.9 at capture time). Each versioned page
supplies its own **Open Source Kubernetes** interval. OpenShift and managed
provider versions are not used as Kubernetes compatibility evidence. Previously
recorded application versions are retained when the moving family docs change.
New chart releases for an already recorded Operator refresh the chart and images
without replacing the previously recorded Kubernetes interval.

The catalog sets `skip_release_summary: true`: the vendor's release notes use
minor-version URLs, so the global `current` navigation link cannot provide
accurate historical upgrade summaries. Other add-ons retain the existing
automatic summary behavior.

These fixtures verify parsing and version mapping, not archive integrity or
runtime compatibility. Live Helm rendering is a separate validation step.
