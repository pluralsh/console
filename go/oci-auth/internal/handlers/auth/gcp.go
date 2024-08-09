package auth

import (
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/fluxcd/pkg/oci/auth/aws"
	"github.com/fluxcd/pkg/oci/auth/azure"
	"github.com/fluxcd/pkg/oci/auth/gcp"
)

func authenticateGCP(credentials *GCPCredentials) (*AuthenticationResponse, error) {
	aws.NewClient().WithConfig(nil)
	azure.NewClient().WithTokenCredential(nil)
	gcp.NewClient().WithTokenURL("")
	_, _ = azidentity.NewManagedIdentityCredential(nil)

	return nil, nil
}
