package controller

import (
	"math/rand"
	"time"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/samber/lo"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
)

const (
	jitter                  = time.Second * 15
	requeueAfter            = time.Second * 30
	requeueWaitForResources = time.Second * 5
)

var (
	waitForResources = ctrl.Result{RequeueAfter: requeueWaitForResources}
)

func jitterRequeue(after, jitter time.Duration) ctrl.Result {
	return ctrl.Result{RequeueAfter: after + time.Duration(rand.Int63n(int64(jitter)))}
}

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
