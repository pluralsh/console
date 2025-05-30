package controller

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"strings"
	"time"

	elastic "github.com/elastic/go-elasticsearch/v9"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/utils"

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

func createElasticsearchClient(ctx context.Context, client client.Client, credentials v1alpha1.ElasticsearchCredentials) (*elastic.Client, error) {
	secret, err := utils.GetSecret(ctx, client, &corev1.SecretReference{Name: credentials.Spec.PasswordSecretKeyRef.Name, Namespace: credentials.Namespace})
	if err != nil {
		return nil, err
	}
	key, exists := secret.Data[credentials.Spec.PasswordSecretKeyRef.Key]
	if !exists {
		return nil, fmt.Errorf("secret %s does not contain key %s", credentials.Spec.PasswordSecretKeyRef.Name, credentials.Spec.PasswordSecretKeyRef.Key)
	}
	password := strings.ReplaceAll(string(key), "\n", "")
	esCfg := elastic.Config{
		Addresses: []string{credentials.Spec.URL},
		Username:  credentials.Spec.Username,
		Password:  password,
	}
	if credentials.Spec.Insecure != nil && *credentials.Spec.Insecure {
		esCfg.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		}
	}
	return elastic.NewClient(esCfg)
}
