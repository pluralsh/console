package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// devboxPlainEnv is the runner's literal env vars, which go into the template.
func devboxPlainEnv(runner *v1alpha1.DevboxRunner) []*ateapi.EnvVar {
	var out []*ateapi.EnvVar
	for _, e := range runner.Spec.Env {
		if e.Value != nil {
			out = append(out, &ateapi.EnvVar{Name: e.Name, Value: *e.Value})
		}
	}
	return out
}

// reconcileEnv resolves the runner's secret env vars into v1alpha1.DevboxRunnerEnvSecret. Unresolvable ones are left out
// and reported on the Env condition; instances still start.
func (r *DevboxRunnerReconciler) reconcileEnv(ctx context.Context, runner *v1alpha1.DevboxRunner) error {
	if !runner.Spec.SecretEnv() {
		meta.RemoveStatusCondition(&runner.Status.Conditions, string(v1alpha1.DevboxEnvConditionType))
		return r.setRunnerEnv(ctx, runner.Name, nil)
	}

	values := map[string]string{}
	var missing []string
	for _, e := range runner.Spec.Env {
		if e.ValueFrom == nil {
			continue
		}
		ref := e.ValueFrom.SecretKeyRef
		ns := lo.FromPtrOr(ref.Namespace, r.Config.OperatorNamespace)
		secret := &corev1.Secret{}
		if err := r.Get(ctx, client.ObjectKey{Namespace: ns, Name: ref.Name}, secret); err != nil {
			if !apierrors.IsNotFound(err) {
				return fmt.Errorf("reading secret %s/%s for %s: %w", ns, ref.Name, e.Name, err)
			}
			missing = append(missing, fmt.Sprintf("%s (secret %s/%s not found)", e.Name, ns, ref.Name))
			continue
		}
		v, ok := secret.Data[ref.Key]
		if !ok {
			missing = append(missing, fmt.Sprintf("%s (key %q not in secret %s/%s)", e.Name, ref.Key, ns, ref.Name))
			continue
		}
		values[e.Name] = string(v)
	}
	if err := r.setRunnerEnv(ctx, runner.Name, values); err != nil {
		return err
	}
	if len(missing) > 0 {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxEnvConditionType, metav1.ConditionFalse, v1alpha1.DevboxMisconfiguredReason,
			"instances start without "+strings.Join(missing, ", "))
		return nil
	}
	utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxEnvConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return nil
}

// setRunnerEnv writes (or, with no values, removes) the runner's entry in v1alpha1.DevboxRunnerEnvSecret.
func (r *DevboxRunnerReconciler) setRunnerEnv(ctx context.Context, runner string, values map[string]string) error {
	key := client.ObjectKey{Namespace: r.Config.OperatorNamespace, Name: v1alpha1.DevboxRunnerEnvSecret}
	secret := &corev1.Secret{}
	err := r.Get(ctx, key, secret)
	if apierrors.IsNotFound(err) {
		if len(values) == 0 {
			return nil
		}
		data, err := json.Marshal(values)
		if err != nil {
			return err
		}
		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: key.Name, Namespace: key.Namespace, Labels: devboxGatewayLabels()},
			Data:       map[string][]byte{runner: data},
		}
		return r.Create(ctx, secret)
	}
	if err != nil {
		return fmt.Errorf("reading %s: %w", v1alpha1.DevboxRunnerEnvSecret, err)
	}

	if len(values) == 0 {
		if _, ok := secret.Data[runner]; !ok {
			return nil
		}
		delete(secret.Data, runner)
		return r.Update(ctx, secret)
	}
	data, err := json.Marshal(values)
	if err != nil {
		return err
	}
	if string(secret.Data[runner]) == string(data) {
		return nil
	}
	if secret.Data == nil {
		secret.Data = map[string][]byte{}
	}
	secret.Data[runner] = data
	return r.Update(ctx, secret)
}
