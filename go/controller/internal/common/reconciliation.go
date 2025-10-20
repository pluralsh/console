package common

import (
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
)

// Wait returns the result to requeue after a short delay. Used for waiting for other resources to be ready.
func Wait() ctrl.Result {
	return ctrl.Result{RequeueAfter: v1alpha1.Jitter(v1alpha1.WaitDefault)}
}

// HandleRequeue allows avoiding rate limiting when some errors occur, i.e., when a resource is not created yet,
// or when it is waiting for an ID. If the result is set, then any potential error will be saved in a condition
// and ignored in the return to avoid rate limiting. If not found error is detected, then the result is automatically
// changed to wait. It is important that at least one from a result or an error has to be non-nil.
func HandleRequeue(result *ctrl.Result, err error, setCondition func(condition metav1.Condition)) (ctrl.Result, error) {
	if err != nil && apierrors.IsNotFound(err) {
		result = lo.ToPtr(Wait())
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
