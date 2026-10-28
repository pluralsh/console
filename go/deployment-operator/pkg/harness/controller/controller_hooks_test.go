package controller

import (
	"testing"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/require"

	harnesserrors "github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
)

func TestValidateStartStatus(t *testing.T) {
	for _, status := range []gqlclient.StackStatus{
		gqlclient.StackStatusPending,
		gqlclient.StackStatusRunning,
		gqlclient.StackStatusPendingApproval,
	} {
		require.NoError(t, validateStartStatus(status), status)
	}

	require.ErrorIs(t, validateStartStatus(gqlclient.StackStatusCancelled), harnesserrors.ErrRemoteCancel)

	for _, status := range []gqlclient.StackStatus{
		gqlclient.StackStatusSuccessful,
		gqlclient.StackStatusFailed,
	} {
		require.ErrorIs(t, validateStartStatus(status), harnesserrors.ErrInvalidStatus, status)
	}
}
