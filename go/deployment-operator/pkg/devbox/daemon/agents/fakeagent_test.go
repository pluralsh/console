package agents

import (
	"os"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/fakeacp"
)

// TestMain doubles as the fake ACP agent (daemon/fakeacp) when the manager re-executes this binary.
func TestMain(m *testing.M) {
	if fakeacp.Enabled() {
		fakeacp.Main()
		os.Exit(0)
	}
	os.Exit(m.Run())
}
