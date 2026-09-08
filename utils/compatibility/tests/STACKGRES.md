# StackGres compatibility scraper

The source is the [official StackGres Helm index](https://stackgres.io/downloads/stackgres-k8s/stackgres/helm/index.yaml), specifically `stackgres-operator` entries' `appVersion`, `version`, and `kubeVersion` fields. The [installation guide](https://stackgres.io/doc/latest/install/helm/) confirms this Helm repository.

Each stable chart provides its own inclusive Kubernetes range. The scraper preserves patch-level changes and passes them to the existing catalog reducer. For example, 1.18.2 ends at Kubernetes 1.34, while 1.18.3 ends at 1.35. This is more precise than using a moving `/latest` page or applying a minor's newest documentation to every patch. The [1.18 documentation](https://stackgres.io/doc/1.18/install/prerequisites/k8s/) corroborates the later 1.18 bounds; [1.17](https://stackgres.io/doc/1.17/install/prerequisites/k8s/), [1.16](https://stackgres.io/doc/1.16/install/prerequisites/k8s/), and [1.14](https://stackgres.io/doc/1.14/install/prerequisites/k8s/) corroborate their respective release lines.

Charts older than 1.5 have no `kubeVersion` and are omitted. Prereleases are excluded. Unknown, unbounded, conflicting, or reversed declared constraints raise an error before updating the catalog. Bounds are never extended to Plural's latest Kubernetes version.

Run from `utils/compatibility` after installing its requirements:

```sh
python -m unittest discover -s tests -p 'test_stackgres.py'
python -c 'from scrapers.stackgres import scrape; scrape()'
```

The standard dispatcher also supports `SCRAPER=stackgres python main.py`. It refreshes the aggregate catalog and Kubernetes changelog in addition to running this scraper.

The fixture is a projection of nine actual entries retrieved on 2026-09-08, retaining only the three consumed fields. Tests verify distinct historic bounds, release filtering, determinism, duplicate handling, and malformed upstream metadata.

The shared image enrichment helper renders charts against the repository's current `KUBE_VERSION`. Historical charts with a lower explicit maximum may refuse that optional rendering; this does not change their compatibility bounds. Helm chart installation is not performed by the scraper.
