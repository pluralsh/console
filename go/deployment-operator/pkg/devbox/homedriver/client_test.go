package homedriver

import (
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/juicefs"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/zerofs"
)

// The client doesn't import the drivers, so this pins the parameter they read.
func TestClaimSeedParamIsTheDrivers(t *testing.T) {
	for driver, param := range map[string]string{juicefs.DriverName: juicefs.ParamClaimSeed, zerofs.DriverName: zerofs.ParamClaimSeed} {
		if param != claimSeedParam {
			t.Errorf("%s claims seeds with %q, the client sends %q", driver, param, claimSeedParam)
		}
	}
}
