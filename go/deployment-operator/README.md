# Deployment Operator

# Testing Local Changes to Dependencies
## Using [Go Work](https://go.dev/doc/tutorial/workspaces)
I'm updating the polly for the .tpl template rendering  
Clone the polly repo locally  
Create a Go Workspace In the repo that has polly as a dependency 
```sh
cd ~/git/plrl
git clone git@github.com:pluralsh/polly.git
cd deployment-operator 
go work init .
```
This creates a go workspace file named _go.work_ in the `deployment-operator` repo  
Tell go to use the locally cloned version of the `polly` repo
```sh
go use ../polly
```
My _go.work_ file now looks like this
```go
// ./go.work

go 1.22.2

use (
	.
	../polly
)

```
Now the Go Workspace settings will allow me to use the local version of the `polly` source code when compiling and testing  


# Integration Testing

Every PR should be fully e2e tested on a realistic cluster.  The simplest mechanism to do this is to:

1. Grab the image tag that was created from your pr, should be here: https://github.com/pluralsh/deployment-operator/pkgs/container/deployment-operator
2. Find a safe test cluster in a Plural Console, go to its `deploy-operator` service, and add a `tag` secret pointing to that tag. (note this is defined in charts/deployment-operator/values.yaml.liquid)
3. Virtually all deployment-operator derived functionality will now derive from that tag, including stacks, sentinels and agent runtime runs.

# Helm Chart Tests

To test that the deployment-operator Helm chart can be successfully installed, run:

```sh
./test/helm/test-chart-install.sh
```

This script will:
1. Create a temporary Kind cluster
2. Validate the chart using `helm lint`
3. Verify template rendering with `helm template`
4. Perform a dry-run installation with `helm install --dry-run`
5. Automatically clean up the cluster when the test completes

See [test/helm/README.md](test/helm/README.md) for more details.


# Unit Tests
## Pre Reqs
### Ensure that the cluster in your current kube context is reachable  
Helm tests will run against this cluster  
You can test with:
```sh
kubectl cluster-info
```

### Install dependencies with make
```sh
make tools
```
### Setup Environment
Set the `KUBEBUILDER_ASSETS` directory
```sh
# Mac
export KUBEBUILDER_ASSETS=${GOBIN}/k8s/1.28.3-darwin-arm64

# Linux
export KUBEBUILDER_ASSETS=${GOBIN}/k8s/1.28.3-linux-amd64
```



## Running Unit Tests
```sh
make test
```

## Adding Tests
Reference the [Ginkgo Getting Started](https://onsi.github.io/ginkgo/#getting-started) to see the expected structure
### Install the Ginkgo CLI
```sh
go install github.com/onsi/ginkgo/v2/ginkgo
```
### The Test Suites for several Packages are already Generated in the Deployment-Operator Repo
If creating a new package or testing a package that doesn't already have a test suite
```sh
cd pkg/package/that/needs/suite
ginkgo bootstrap
```

### Generate A Basic test
I'm creating a test for  ./pkg/manifests/template/tpl.go 
```sh
cd ./pkg/manifests/template
ginkgo generate tpl
```
example output
```sh
Generating ginkgo test for Tpl in:
  tpl_test.go
```
It generates: `./pkg/manifests/template/tpl_test.go`
```sh
# ./pkg/manifests/template/tpl_test.go
package template_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/pluralsh/deployment-operator/pkg/manifests/template"
)

var _ = Describe("Tpl", func() {

})

```
### From here you can begin adding `specs` (test) to your generated file
```sh
# ./pkg/manifests/template/tpl_test.go
var _ = Describe("Tpl", func() {

	Context("Example Test", func() {
		It("Should always Pass", func() {
			Expect(1).To(Equal(1))
		})
	})

    Context("Test Should Fail for example output", func() {
		It("Should always fail", func() {
			Expect(1).To(Equal(2))
		})
	})

})
```

### Run the Suite with your New Test
 I'm doing this here just for an example and to check that my tests are bing added to the Suite
```sh

make test
# ... other output

[GIN-debug] GET    /version                  --> github.com/pluralsh/deployment-operator/pkg/manifests/template.init.func1.1 (3 handlers)
Running Suite: Controller Suite - /Users/kjj/git/plrl/deployment-operator/pkg/manifests/template
================================================================================================
Random Seed: 1715288079

Will run 6 of 6 specs
# Warning: 'bases' is deprecated. Please use 'resources' instead. Run 'kustomize edit fix' to update your Kustomization automatically.
# Warning: 'patchesStrategicMerge' is deprecated. Please use 'patches' instead. Run 'kustomize edit fix' to update your Kustomization automatically.
••
------------------------------
• [FAILED] [0.000 seconds]
Tpl Test Should Fail for example output [It] Should always Fail
/Users/kjj/git/plrl/deployment-operator/pkg/manifests/template/tpl_test.go:17

  [FAILED] Expected
      <int>: 1
  to equal
      <int>: 2
  In [It] at: /Users/kjj/git/plrl/deployment-operator/pkg/manifests/template/tpl_test.go:18 @ 05/09/24 16:54:41.29
------------------------------
2024/05/09 16:54:41 render helm templates: enable dependency update= false dependencies= 0
Found unknown types unknown resource types: apiextensions.k8s.io/v1/CustomResourceDefinition,apiextensions.k8s.io/v1/CustomResourceDefinition, ignoring for now2024/05/09 16:54:41 Server exiting
•••

Summarizing 1 Failure:
  [FAIL] Tpl Test Should Fail for example output [It] Should always Fail
  /Users/kjj/git/plrl/deployment-operator/pkg/manifests/template/tpl_test.go:18

Ran 6 of 6 Specs in 2.810 seconds
FAIL! -- 5 Passed | 1 Failed | 0 Pending | 0 Skipped
--- FAIL: TestControllers (2.81s)
FAIL
FAIL    github.com/pluralsh/deployment-operator/pkg/manifests/template  3.421s
FAIL
make: *** [test] Error 1

```
