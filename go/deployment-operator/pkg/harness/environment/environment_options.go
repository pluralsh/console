package environment

import (
	"github.com/pluralsh/deployment-operator/internal/helpers"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
)

// WithWorkingDir allows changing the default working directory of the Environment.
func WithWorkingDir(dir string) Option {
	return func(e *environment) {
		e.dir = dir
	}
}

// WithFilesDir allow changing the default path where all additional files are being created.
func WithFilesDir(dir string) Option {
	return func(e *environment) {
		e.filesDir = dir
	}
}

// WithFetchClient allows configuring helpers.FetchClient used by the Environment
// to download files.
func WithFetchClient(client helpers.FetchClient) Option {
	return func(e *environment) {
		e.fetchClient = client
	}
}

// WithStackRun provides information about stack run used to initialize
// the Environment.
func WithStackRun(stackRun *v1.StackRun) Option {
	return func(e *environment) {
		e.stackRun = stackRun
	}
}
