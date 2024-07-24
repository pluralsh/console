package types

import (
	ctrl "sigs.k8s.io/controller-runtime"
)

// Controller is a simple interface that unifies the way of
// initializing reconcilers with ctrl.Manager.
type Controller interface {
	SetupWithManager(manager ctrl.Manager) error
}
