package environment

import (
	"github.com/pluralsh/deployment-operator/internal/helpers"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
)

// Environment is responsible for handling harness working directory.
// It can initialize, download and create required files.
type Environment interface {
	// Setup ensures that the environment is correctly initialized
	Setup() error
}

type environment struct {
	// stackRun provides all information required to prepare
	// the environment and working directory for the actual
	// execution of the stack run. For example, it provides
	// URL of the tarball with mandatory files needed to run
	// stack run step commands.
	stackRun *v1.StackRun
	// dir is a working directory where tarball files/dirs are unpacked.
	dir string
	// filesDir is a working directory where all additional files should be
	// unpacked/created. It is equal to dir if empty.
	filesDir string
	// fetchClient is a helper client used to download and unpack the tarball.
	fetchClient helpers.FetchClient
}

// Option allows to modify Environment behavior.
type Option func(*environment)
