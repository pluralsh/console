package controller

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	tunnelControllerContainerName  = "tunnel-controller"
	tunnelControllerSpecAnnotation = "deployments.plural.sh/tunnel-controller-spec-sha"
	tunnelTokenMountPath           = "/var/run/ferrotunnel"
	tunnelTLSMountPath             = "/var/run/ferrotunnel/tls"
)

// FerroTunnelConfig is the deployment operator configuration for every TunnelController.
// The custom resource only supplies its name and image.
type FerroTunnelConfig struct {
	Server             string
	ServiceAccountName string
	Token              string
	CACert             string
	Cert               string
	Key                string
}

func (in FerroTunnelConfig) validate() error {
	missing := make([]string, 0)
	for _, field := range []struct {
		name  string
		value string
	}{
		{"server", in.Server},
		{"service account", in.ServiceAccountName},
		{"token", in.Token},
		{"ca certificate", in.CACert},
		{"client certificate", in.Cert},
		{"client key", in.Key},
	} {
		if field.value == "" {
			missing = append(missing, field.name)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("ferrotunnel operator configuration is missing %s", strings.Join(missing, ", "))
	}
	return nil
}

// TunnelControllerReconciler reconciles a TunnelController object by ensuring
// one FerroTunnel client Deployment.
type TunnelControllerReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Config FerroTunnelConfig
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=tunnelcontrollers,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=tunnelcontrollers/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=tunnelcontrollers/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update;patch;delete

func (r *TunnelControllerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	tunnelController := &v1alpha1.TunnelController{}
	if err := r.Get(ctx, req.NamespacedName, tunnelController); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, tunnelController)
	if err != nil {
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	if !tunnelController.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	if tunnelController.Spec.Image == "" {
		tunnelController.Spec.Image = v1alpha1.DefaultTunnelControllerImage
	}
	if err := r.Config.validate(); err != nil {
		utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	secret := operatorTunnelSecret(tunnelController, r.Config)
	if err := controllerutil.SetControllerReference(tunnelController, secret, r.Scheme); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to set tunnel controller Secret owner: %w", err)
	}
	if err := r.ensureSecret(ctx, secret); err != nil {
		return ctrl.Result{}, err
	}

	desired, err := tunnelControllerDeployment(tunnelController, r.Config, secret)
	if err != nil {
		utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if err := controllerutil.SetControllerReference(tunnelController, desired, r.Scheme); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to set tunnel controller Deployment owner: %w", err)
	}

	existing := &appsv1.Deployment{}
	err = r.Get(ctx, client.ObjectKeyFromObject(desired), existing)
	if errors.IsNotFound(err) {
		if err := r.Create(ctx, desired); err != nil {
			return ctrl.Result{}, fmt.Errorf("failed to create tunnel controller Deployment: %w", err)
		}
		utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "waiting for the tunnel controller Deployment")
		return ctrl.Result{}, nil
	}
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to get tunnel controller Deployment: %w", err)
	}
	if !metav1.IsControlledBy(existing, tunnelController) {
		return ctrl.Result{}, fmt.Errorf("Deployment %s/%s is not controlled by TunnelController", existing.Namespace, existing.Name)
	}

	if existing.Annotations[tunnelControllerSpecAnnotation] != desired.Annotations[tunnelControllerSpecAnnotation] {
		existing.Annotations = desired.Annotations
		existing.Labels = desired.Labels
		existing.Spec = desired.Spec
		if err := r.Update(ctx, existing); err != nil {
			return ctrl.Result{}, fmt.Errorf("failed to update tunnel controller Deployment: %w", err)
		}
	}

	if existing.Status.AvailableReplicas > 0 {
		utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		return ctrl.Result{}, nil
	}
	utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "waiting for the tunnel controller Deployment")
	return ctrl.Result{}, nil
}

func (r *TunnelControllerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.TunnelController{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Secret{}).
		Complete(r)
}

func tunnelControllerDeployment(tunnelController *v1alpha1.TunnelController, config FerroTunnelConfig, secret *corev1.Secret) (*appsv1.Deployment, error) {
	sha, err := utils.HashObject(struct {
		Image  string            `json:"image"`
		Server string            `json:"server"`
		Secret map[string][]byte `json:"secret"`
	}{Image: tunnelController.Spec.Image, Server: config.Server, Secret: secret.Data})
	if err != nil {
		return nil, fmt.Errorf("failed to hash TunnelController spec: %w", err)
	}

	labels := map[string]string{
		v1alpha1.TunnelControllerNameLabel: tunnelController.Name,
		"app.kubernetes.io/component":      "tunnel-controller",
	}
	args := []string{
		"--server", config.Server,
		"--token-file", tunnelTokenMountPath + "/token",
		"--tls-ca", tunnelTLSMountPath + "/ca.crt",
		"--tls-cert", tunnelTLSMountPath + "/tls.crt",
		"--tls-key", tunnelTLSMountPath + "/tls.key",
	}
	volumeMounts := []corev1.VolumeMount{
		{Name: "token", MountPath: tunnelTokenMountPath, ReadOnly: true},
		{Name: "tls", MountPath: tunnelTLSMountPath, ReadOnly: true},
	}
	volumes := []corev1.Volume{
		{
			Name: "token",
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: secret.Name,
					Items:      []corev1.KeyToPath{{Key: "token", Path: "token"}},
				},
			},
		},
		{
			Name: "tls",
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: secret.Name,
					Items: []corev1.KeyToPath{
						{Key: "ca.crt", Path: "ca.crt"},
						{Key: "tls.crt", Path: "tls.crt"},
						{Key: "tls.key", Path: "tls.key"},
					},
				},
			},
		},
	}

	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      tunnelController.Name,
			Namespace: tunnelController.Namespace,
			Labels:    labels,
			Annotations: map[string]string{
				tunnelControllerSpecAnnotation: sha,
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: int32Ptr(1),
			Selector: &metav1.LabelSelector{MatchLabels: labels},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec: corev1.PodSpec{
					ServiceAccountName: config.ServiceAccountName,
					Containers: []corev1.Container{{
						Name:            tunnelControllerContainerName,
						Image:           tunnelController.Spec.Image,
						ImagePullPolicy: corev1.PullIfNotPresent,
						Args:            args,
						VolumeMounts:    volumeMounts,
					}},
					Volumes: volumes,
				},
			},
		},
	}, nil
}

func operatorTunnelSecretName(tunnelController *v1alpha1.TunnelController) string {
	return tunnelController.Name + "-ferrotunnel"
}

func operatorTunnelSecret(tunnelController *v1alpha1.TunnelController, config FerroTunnelConfig) *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      operatorTunnelSecretName(tunnelController),
			Namespace: tunnelController.Namespace,
		},
		Data: map[string][]byte{
			"token":   []byte(config.Token),
			"ca.crt":  []byte(config.CACert),
			"tls.crt": []byte(config.Cert),
			"tls.key": []byte(config.Key),
		},
	}
}

func (r *TunnelControllerReconciler) ensureSecret(ctx context.Context, desired *corev1.Secret) error {
	existing := &corev1.Secret{}
	err := r.Get(ctx, client.ObjectKeyFromObject(desired), existing)
	if errors.IsNotFound(err) {
		if err := r.Create(ctx, desired); err != nil {
			return fmt.Errorf("failed to create tunnel controller Secret: %w", err)
		}
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to get tunnel controller Secret: %w", err)
	}
	if secretDataEqual(existing.Data, desired.Data) {
		return nil
	}
	existing.Data = desired.Data
	if err := r.Update(ctx, existing); err != nil {
		return fmt.Errorf("failed to update tunnel controller Secret: %w", err)
	}
	return nil
}

func secretDataEqual(left, right map[string][]byte) bool {
	if len(left) != len(right) {
		return false
	}
	for key, value := range right {
		if !bytes.Equal(left[key], value) {
			return false
		}
	}
	return true
}

func int32Ptr(value int32) *int32 {
	return &value
}
