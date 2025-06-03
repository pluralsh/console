package controller

import (
	"time"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/samber/lo"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	requeueDefault          = 30 * time.Second
	requeueWaitForResources = 5 * time.Second
)

var (
	requeue          = ctrl.Result{RequeueAfter: requeueDefault}
	waitForResources = ctrl.Result{RequeueAfter: requeueWaitForResources}
)

// handleRequeue allows avoiding rate limiting when some errors occur,
// i.e., when a resource is not created yet, or when it is waiting for an ID.
//
// If the result is set, then any potential error will be saved in a condition
// and ignored in the return to avoid rate limiting.
//
// If not found error is detected, then the result is automatically changed to
// wait for resources.
//
// It is important that at least one from a result or an error have to be non-nil.
// nolint:unparam
func handleRequeue(result *ctrl.Result, err error, setCondition func(condition metav1.Condition)) (ctrl.Result, error) {
	if err != nil && apierrors.IsNotFound(err) {
		result = &waitForResources
	}

	utils.MarkCondition(setCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse,
		v1alpha1.SynchronizedConditionReasonError, defaultErrMessage(err, ""))
	return lo.FromPtr(result), lo.Ternary(result != nil, nil, err)
}

// defaultErrMessage extracts error message if error is non-nil, otherwise it returns default message.
func defaultErrMessage(err error, defaultMessage string) string {
	if err != nil {
		return err.Error()
	}

	return defaultMessage
}
