## Kubernetes compatibility

Karmada is compatible with a wide range of Kubernetes versions. For detailed compatibility instructions,
please refer to the [Kubernetes Compatibility](https://karmada.io/docs/administrator/compatibility/).

The following table shows compatibility test results for each Karmada version against 10 Kubernetes versions:

|                       | Kubernetes 1.36 | Kubernetes 1.35 | Kubernetes 1.34 | Kubernetes 1.33 | Kubernetes 1.32 | Kubernetes 1.31 | Kubernetes 1.30 | Kubernetes 1.29 | Kubernetes 1.28 | Kubernetes 1.27 | Kubernetes 1.26 |
|-----------------------|-----------------|-----------------|-----------------|-----------------|-----------------|-----------------|-----------------|-----------------|-----------------|-----------------|-----------------|
| Karmada v1.17         |                 | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               |
| Karmada v1.18         |                 | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               |
| Karmada v1.19         | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               |                 |
| Karmada HEAD (master) | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               | ✓               |                 |

Key:
* `✓` Karmada and the Kubernetes version are exactly compatible.
* `+` Karmada has features or API objects that may not be present in the Kubernetes version.
* `-` The Kubernetes version has features or API objects that Karmada can't use.
