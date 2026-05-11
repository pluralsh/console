package stackrun

import (
	"context"
	"fmt"
	"net/http"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/klog/v2"

	clienterrors "github.com/pluralsh/deployment-operator/internal/errors"
	console "github.com/pluralsh/deployment-operator/pkg/client"
)

func MarkStackRun(client console.Client, id string, status gqlclient.StackStatus) error {
	return client.UpdateStackRun(id, gqlclient.StackRunAttributes{
		Status: status,
	})
}

func MarkStackRunWithRetry(client console.Client, id string, status gqlclient.StackStatus, interval time.Duration) {
	// Ignore error since we never return it from the condition function.
	_ = wait.PollUntilContextCancel(context.Background(), interval, true, func(ctx context.Context) (done bool, err error) {
		err = MarkStackRun(client, id, status)
		if err != nil {
			if clienterrors.IsUnauthenticated(err) {
				klog.Errorf("stack run update stopped due to console authentication failure: %v", err)
				return true, nil
			}

			klog.Errorf("stack run update failed: %v", err)
			return false, nil
		}

		return true, nil
	})
}

func StartStackRun(client console.Client, id string) error {
	return MarkStackRun(client, id, gqlclient.StackStatusRunning)
}

func CompleteStackRun(client console.Client, id string, attributes *gqlclient.StackRunAttributes) (err error) {
	if attributes == nil {
		return fmt.Errorf("cannot complete stack run with nil attributes")
	}

	createModifierIter := func() func() func(attributes *gqlclient.StackRunAttributes) *gqlclient.StackRunAttributes {
		idx := 0
		modifiers := []func(attributes *gqlclient.StackRunAttributes) *gqlclient.StackRunAttributes{
			func(attributes *gqlclient.StackRunAttributes) *gqlclient.StackRunAttributes {
				if attributes.State == nil {
					return attributes
				}

				// first drop the state
				attributes.State.State = nil
				return attributes
			},
			func(attributes *gqlclient.StackRunAttributes) *gqlclient.StackRunAttributes {
				if attributes.State == nil {
					return attributes
				}

				// next drop the plan
				attributes.State.Plan = nil
				return attributes
			},
		}

		return func() func(attributes *gqlclient.StackRunAttributes) *gqlclient.StackRunAttributes {
			if idx > len(modifiers) {
				return nil
			}

			m := modifiers[idx]
			idx++
			return m
		}
	}

	next := createModifierIter()
	for {
		if err = client.CompleteStackRun(id, *attributes); !clienterrors.IsNetworkError(err, http.StatusRequestEntityTooLarge) {
			return err
		}

		if modifier := next(); modifier != nil {
			attributes = modifier(attributes)
			continue
		}

		return err
	}
}

func CancelStackRun(client console.Client, id string) error {
	return MarkStackRun(client, id, gqlclient.StackStatusCancelled)
}

func FailStackRun(client console.Client, id string) error {
	return MarkStackRun(client, id, gqlclient.StackStatusFailed)
}

func MarkStackRunStep(client console.Client, id string, status gqlclient.StepStatus) error {
	return client.UpdateStackRunStep(id, gqlclient.RunStepAttributes{
		Status: status,
	})
}

func StartStackRunStep(client console.Client, id string) error {
	return MarkStackRunStep(client, id, gqlclient.StepStatusRunning)
}

func CompleteStackRunStep(client console.Client, id string) error {
	return MarkStackRunStep(client, id, gqlclient.StepStatusSuccessful)
}

func FailStackRunStep(client console.Client, id string) error {
	return MarkStackRunStep(client, id, gqlclient.StepStatusFailed)
}
