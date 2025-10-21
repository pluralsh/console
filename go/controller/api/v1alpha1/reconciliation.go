package v1alpha1

import (
	"math/rand"
	"time"

	ctrl "sigs.k8s.io/controller-runtime"
)

const (
	RequeueDefault = 30 * time.Minute
	WaitDefault    = 30 * time.Second
)

// Jitter adds a random jitter to the given duration.
// This helps to avoid thundering herd problems when multiple resources
// are reconciled at the same time.
// The jitter is up to half of the given duration plus 30 seconds.
func Jitter(t time.Duration) time.Duration {
	return t + time.Duration(rand.Intn(int(t/2+(time.Second*30))))
}

// Reconciliation parameters for a specific resource.
type Reconciliation struct {
	// DriftDetection enables drift detection for this resource.
	// It is destined to detect changes made to the related
	// resources that are not referenced with owner ref.
	// Use with Interval to set how often drift detection runs.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	// +kubebuilder:example:=false
	DriftDetection *bool `json:"driftDetection,omitempty"`

	// Interval for DriftDetection mechanism.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:default="30m"
	// +kubebuilder:example:="5m30s"
	Interval *string `json:"interval,omitempty"`
}

// Requeue returns ctrl.Result based on the resource Reconciliation spec.
// Used for drift detection.
func (r *Reconciliation) Requeue() ctrl.Result {
	if r != nil && r.DriftDetection != nil && !*r.DriftDetection {
		return ctrl.Result{}
	}

	interval := RequeueDefault
	if r != nil && r.Interval != nil {
		if parsed, err := time.ParseDuration(*r.Interval); err == nil {
			interval = parsed
		}
	}

	return ctrl.Result{RequeueAfter: Jitter(interval)}
}
