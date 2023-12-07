package types

import (
	ctrl "sigs.k8s.io/controller-runtime"
)

type Controller interface {
	SetupWithManager(manager ctrl.Manager) error
}
