package controller

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	apierrs "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	envConsoleURL   = "PLRL_CONSOLE_URL"
	envConsoleToken = "PLRL_CONSOLE_TOKEN"
	envRunID        = "PLRL_SENTINEL_RUN_ID"
	envFormat       = "PLRL_OUTPUT_FORMAT"
)

func (r *SentinelRunJobReconciler) getRunSecretData(runID, format string) map[string]string {
	return map[string]string{
		envConsoleURL:   r.ConsoleURL,
		envConsoleToken: r.DeployToken,
		envRunID:        runID,
		envFormat:       format,
	}
}

func (r *SentinelRunJobReconciler) hasRunSecretData(data map[string][]byte, runID string) bool {
	token, hasToken := data[envConsoleToken]
	url, hasUrl := data[envConsoleURL]
	id, hasID := data[envRunID]
	return hasToken && hasUrl && hasID &&
		string(token) == r.DeployToken && string(url) == r.ConsoleURL && string(id) == runID
}

func (r *SentinelRunJobReconciler) reconcileRunSecret(ctx context.Context, name, namespace, runID, format string) (*corev1.Secret, error) {
	logger := log.FromContext(ctx)

	secret := &corev1.Secret{}
	if err := r.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, secret); err != nil {
		if !apierrs.IsNotFound(err) {
			return nil, err
		}

		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
			StringData: r.getRunSecretData(runID, format),
		}
		logger.V(2).Info("creating secret", "namespace", secret.Namespace, "name", secret.Name)
		if err := r.Create(ctx, secret); err != nil {
			logger.Error(err, "unable to create secret")
			return nil, err
		}

		return secret, nil
	}

	if !r.hasRunSecretData(secret.Data, runID) {
		logger.V(2).Info("updating secret", "namespace", secret.Namespace, "name", secret.Name)
		secret.StringData = r.getRunSecretData(runID, format)
		if err := r.Update(ctx, secret); err != nil {
			logger.Error(err, "unable to update secret")
			return nil, err
		}
	}

	return secret, nil
}
