package controller

import (
	"context"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	apierrs "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	envStackRunID = "PLRL_STACK_RUN_ID"
)

func (r *StackRunJobReconciler) getRunSecretData(runID string) map[string]string {
	return map[string]string{
		envConsoleURL:   r.ConsoleURL,
		envConsoleToken: r.DeployToken,
		envStackRunID:   runID,
	}
}

func (r *StackRunJobReconciler) hasRunSecretData(data map[string][]byte, runID string) bool {
	token, hasToken := data[envConsoleToken]
	url, hasUrl := data[envConsoleURL]
	id, hasID := data[envStackRunID]
	return hasToken && hasUrl && hasID &&
		string(token) == r.DeployToken && string(url) == r.ConsoleURL && string(id) == runID
}

func (r *StackRunJobReconciler) reconcileSecret(ctx context.Context, run *v1alpha1.StackRunJob) (*corev1.Secret, error) {
	logger := log.FromContext(ctx)

	secret := &corev1.Secret{}
	if err := r.Get(ctx, types.NamespacedName{Name: run.Name, Namespace: run.Namespace}, secret); err != nil {
		if !apierrs.IsNotFound(err) {
			return nil, err
		}

		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: run.Name, Namespace: run.Namespace},
			StringData: r.getRunSecretData(run.Spec.RunID),
		}
		logger.V(2).Info("creating secret", "namespace", secret.Namespace, "name", secret.Name)
		if err := r.Create(ctx, secret); err != nil {
			logger.Error(err, "unable to create secret")
			return nil, err
		}

		return secret, nil
	}

	if !r.hasRunSecretData(secret.Data, run.Spec.RunID) {
		logger.V(2).Info("updating secret", "namespace", secret.Namespace, "name", secret.Name)
		secret.StringData = r.getRunSecretData(run.Spec.RunID)
		if err := r.Update(ctx, secret); err != nil {
			logger.Error(err, "unable to update secret")
			return nil, err
		}
	}

	return secret, nil
}
