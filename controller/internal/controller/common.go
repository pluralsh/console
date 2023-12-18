package controller

import (
	"time"

	ctrl "sigs.k8s.io/controller-runtime"
)

const (
	// requeueAfter is the time between scheduled reconciles if there are no changes to the CRD.
	requeueAfter = 30 * time.Second
)

var (
	requeue = ctrl.Result{RequeueAfter: requeueAfter}
)
