package controller

import (
	"context"
	"math/rand"
	"time"

	corev1 "k8s.io/api/core/v1"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	"github.com/samber/lo"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	requeueDefault                             = 30 * time.Second
	requeueWaitForResources                    = 5 * time.Second
	ElasticSearchSecretProtectionFinalizerName = "projects.deployments.plural.sh/elastic-search-secret-protection"
	PostgresSecretProtectionFinalizerName      = "projects.deployments.plural.sh/postgres-secret-protection"
	MySqlSecretProtectionFinalizerName         = "projects.deployments.plural.sh/mysql-secret-protection"
)

var (
	requeue          = ctrl.Result{RequeueAfter: requeueDefault}
	waitForResources = ctrl.Result{RequeueAfter: requeueWaitForResources}
)

func jitterRequeue(t time.Duration) ctrl.Result {
	return ctrl.Result{RequeueAfter: t + time.Duration(rand.Intn(int(t/2)))}
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

func deleteRefSecret(ctx context.Context, k8sclient client.Client, namespace, name, finalizer string) error {
	credentialSecret := &corev1.Secret{}
	if err := k8sclient.Get(ctx, client.ObjectKey{Name: name, Namespace: namespace}, credentialSecret); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}
		return err
	}
	if err := k8sclient.Delete(ctx, credentialSecret); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}
		return err
	}

	if err := utils.TryRemoveFinalizer(ctx, k8sclient, credentialSecret, finalizer); err != nil {
		return err
	}

	return nil
}
