package types

import "github.com/pluralsh/console/go/client"

// TestCase is a reflection of pkg/sentinel-harness/controller/controller_types.go TestCase object.
// It is used to unmarshall YAML file marshaled by the controller when creating a Job.
type TestCase struct {
	Configurations []client.TestCaseConfigurationFragment                           `json:"configurations,omitempty"`
	Defaults       *client.SentinelCheckIntegrationTestDefaultConfigurationFragment `json:"defaults,omitempty"`
}
