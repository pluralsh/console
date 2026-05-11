package environment

import (
	"os"

	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

// Setup implements the Environment interface to prepare for the
// start of the gqlclient.StackRun.
//
// 1. Creates a working dir if it doesn't exist.
// 2. Downloads the tarball related to stack run and unpacks it into the working dir.
// 3. Creates any additional files that are part of the gqlclient.StackRun.
func (in *environment) Setup() error {
	if err := in.prepareTarball(); err != nil {
		return err
	}

	if err := in.prepareFiles(); err != nil {
		return err
	}

	return nil
}

func (in *environment) prepareTarball() error {
	if _, err := in.fetchClient.Tarball(in.stackRun.Tarball); err != nil {
		klog.ErrorS(err, "failed preparing tarball", "path", in.dir)
		return err
	}

	klog.V(log.LogLevelInfo).InfoS("successfully downloaded and unpacked tarball", "path", in.dir)
	return nil
}

func (in *environment) prepareFiles() error {
	if in.stackRun.Files == nil {
		return nil
	}

	for _, fragment := range in.stackRun.Files {
		destination := fragment.Path
		perm := 0644
		if in.stackRun.SSHKeyFile != nil && *in.stackRun.SSHKeyFile == destination {
			perm = 0600
		}
		if err := helpers.File().Create(destination, fragment.Content, os.FileMode(perm)); err != nil {
			klog.ErrorS(err, "failed preparing files", "path", destination)
			return err
		}

		klog.V(log.LogLevelInfo).InfoS("successfully created file", "path", destination)
	}

	return nil
}

// init ensures that all required values are initialized
func (in *environment) init() Environment {
	if in.stackRun == nil {
		klog.Fatal("could not initialize environment: stackRun is nil")
	}

	if len(in.dir) != 0 {
		helpers.EnsureDirOrDie(in.dir)
	}

	if len(in.filesDir) == 0 {
		in.filesDir = in.dir
	}

	return in
}

// New creates a new Environment.
func New(options ...Option) Environment {
	result := new(environment)

	for _, opt := range options {
		opt(result)
	}

	return result.init()
}
