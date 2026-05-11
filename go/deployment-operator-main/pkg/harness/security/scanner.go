package security

import (
	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/harness/security/trivy"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/security/v1"
)

// NewScanner creates a new [Scanner] instance based on the provided config.
func NewScanner(config *gqlclient.PolicyEngineFragment) v1.Scanner {
	if config == nil {
		return nil
	}

	var s v1.Scanner

	switch config.Type {
	case gqlclient.PolicyEngineTypeTrivy:
		s = trivy.New(config)
	default:
		klog.Fatalf("unsupported scanner type: %s", config.Type)
	}

	return s
}
