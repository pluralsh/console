# Building a Sentinel Harness Test Image with Terratest Suites

This guide explains how to use the `sentinel-harness-base` image to build a new container image that packages your own 
Terratest end-to-end (E2E) tests. This image can then be run as a Kubernetes Job by the Sentinel Harness system to automatically
execute tests against your cluster.

The resulting image is suitable for running as a Kubernetes Job, which automatically:
 - Executes your test suite under the control of the sentinel-harness binary
 - Generates two test report files:
   - /plural/unit-tests.xml (JUnit format)
   - /plural/unit-tests.json (plaintext format)
 - Sends results back to the Plural Console

## Building the Image
To build a working Terratest image, your Dockerfile must include the following key parts:

### Base Image Import
Start with the `sentinel-harness-base` image.
This provides the compiled `sentinel-harness` binary responsible for managing and reporting tests.

```
FROM ghcr.io/pluralsh/sentinel-harness-base:<tag> AS harness
```

### Copy Test Suite
Finally, copy your test suite into the container. 
```
# Copy test files
COPY dockerfiles/sentinel-harness/terratest /sentinel
```

### Entrypoint

Define the entrypoint to execute the harness binary with the required arguments.
```
ENTRYPOINT ["sentinel-harness", "--test-dir=/sentinel", "--output-dir=/plural"]
```
This command:
 - Executes all tests in `/sentinel`
 - Writes `unit-tests.xml` and `unit-tests.json` to /plural
 - Returns compatible output to Plural Console