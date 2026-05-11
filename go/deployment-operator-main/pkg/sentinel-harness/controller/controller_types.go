package controller

import (
	"context"

	"github.com/pluralsh/console/go/client"

	console "github.com/pluralsh/deployment-operator/pkg/client"
)

type Controller interface {
	Start(ctx context.Context) error
}

type sentinelRunController struct {
	sentinelRunID string

	// consoleClient
	consoleClient console.Client

	testDir string

	outputDir string

	outputFormat string

	// consoleToken
	consoleToken string

	timeoutDuration string

	consoleURL string
}

type Option func(*sentinelRunController)

type TestCase struct {
	Configurations []client.TestCaseConfigurationFragment                           `json:"configurations,omitempty"`
	Defaults       *client.SentinelCheckIntegrationTestDefaultConfigurationFragment `json:"defaults,omitempty"`
}
