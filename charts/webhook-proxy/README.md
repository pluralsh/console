To deploy webhook-proxy against your console edit `values.yaml` to ensure that `configMap.host` points to your console instance:

```yaml
configMap:
  host: "http://{your-console-url}"
```