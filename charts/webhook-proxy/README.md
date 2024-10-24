To deploy webhook-proxy against your console edit `values.yaml` to ensure that `configMap.host` points to your console instance:

```yaml
# Config map with NGINX configuration.
configMap:
  # The name of the config map to use.
  # If not set, a name is generated using the fullname template
  name: ""
  annotations: {}
  host: "http://{your-console-url}"
```