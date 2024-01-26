package controller

import (
	"time"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/client"
)

const (
	// requeueAfter is the time between scheduled reconciles if there are no changes to the CRD.
	requeueAfter = 30 * time.Second
)

var (
	requeue = ctrl.Result{RequeueAfter: requeueAfter}
)

func ensureBindings(bindings []v1alpha1.Binding, client client.ConsoleClient) ([]v1alpha1.Binding, error) {
	for i := range bindings {
		binding, err := ensureBinding(bindings[i], client)
		if err != nil {
			return bindings, err
		}

		bindings[i] = binding
	}

	return bindings, nil
}

func ensureBinding(binding v1alpha1.Binding, client client.ConsoleClient) (v1alpha1.Binding, error) {
	if binding.GroupName == nil && binding.UserEmail == nil {
		return binding, nil
	}

	if binding.GroupName != nil {
		group, err := client.GetGroup(*binding.GroupName)
		if err != nil {
			return binding, err
		}

		binding.GroupID = &group.ID
	}

	if binding.UserEmail != nil {
		user, err := client.GetUser(*binding.UserEmail)
		if err != nil {
			return binding, err
		}

		binding.UserID = &user.ID
	}

	return binding, nil
}
