# Overview
This is a sample service that sometimes fails (i.e. runs into an error) while processing HTTP requests.

# Service Details
## Build and Run
`go build`

followed by `./flaky-service <options>`

## Options
Can be viewed at `args/args.go` but here is an explanation anyways for convenience.
| Option | Default | Explanation |
| :--- | :--- | :--- |
| `--api-path` | `/api` | the HTTP GET api path for the flaky service
| `--api-bind-address` | `:8080` | The address the flaky-service listens to for API requests
| `--metrics-path` | `/metrics` | The metrics path for the flaky service (is also an HTTP GET)
| `--metrics-bind-address` | `:8081` | The address the metrics server for flaky-service listens to
| `--response-behavior-modifier` | `none` | Currently supports `none` or `timestamp`. See [HTTP Response Behavior Modification](#http-response-behavior-modification)
| `--behavior-modifier-timestamp-modulus` | `3` | Used if `--response-behavior-modifer=timestamp` is set.

## HTTP Response Behavior Modification
### None
The server logs a message and sends back a response with HTTP 200 status and 

### Timestamp
Using a `timestamp` (in millseconds) of when the message is received by the server and a `modulus` value passed in from the CLI option `--behavior-modifier-timestamp-modulus`:
```
if timestamp % modulus == 0
    return HTTP 500 (InternalServerException)
else
    return HTTP 200
```

