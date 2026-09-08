# NVIDIA Network Operator compatibility

The scraper joins stable application/chart versions from
https://helm.ngc.nvidia.com/nvidia/index.yaml with the **Kubernetes** row in
each release's **Component / Version** prerequisites table. It expands only
explicit inclusive minor bounds; it does not infer compatibility from release
dates, the GPU Operator, or the OpenShift platform column.

Sources include:

- https://docs.nvidia.com/networking/display/kubernetes2670/platform-support.html
- https://docs.nvidia.com/networking/display/kubernetes2641/platform-support.html
- https://docs.nvidia.com/networking/display/kubernetes2470/platform-support.html

The fixtures are prerequisite-table excerpts retrieved on 2026-09-08, with
the release identity added as a minimal page wrapper. They cover two real
minor ranges and the older patch ceiling. Other fixtures in the test module
are deliberately hand-written malformed/selection cases.

Coverage limits are intentional:

- Missing version-specific pages are skipped, with a warning.
- Page identity must match the chart's application version. In particular,
  `kubernetes2410` serves **24.10.0**, not **24.1.0**.
- `<=1.30.4` cannot be represented faithfully as a minor-only support list.
  Releases with that ceiling are skipped rather than asserting all of 1.30
  is supported. The original bound is printed in the warning and retained in
  the 24.7.0 fixture.
- These are upstream software prerequisites, not proof that every OS, NIC,
  firmware, or deployment topology is supported. Consult the release's full
  platform table for those constraints.

Run the offline checks from the repository root:

```sh
python3 -m unittest discover -s utils/compatibility/tests -p test_network_operator.py -v
```

The normal compatibility runner can select this scraper with
`SCRAPER=network-operator` from `utils/compatibility`. A total source/parsing
failure raises before the compatibility file is updated.
