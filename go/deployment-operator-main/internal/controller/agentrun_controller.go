package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	pluralclient "github.com/pluralsh/deployment-operator/pkg/client"
)

const (
	AgentRunFinalizer    = "deployments.plural.sh/agentrun-protection"
	requeueAfterAgentRun = 2 * time.Minute
	agentRunMaxLifetime  = 12 * time.Hour
	EnvConsoleURL        = "PLRL_CONSOLE_URL"
	EnvDeployToken       = "PLRL_DEPLOY_TOKEN"
	EnvAgentRunID        = "PLRL_AGENT_RUN_ID"

	EnvOpenCodeProvider = "PLRL_OPENCODE_PROVIDER"
	EnvOpenCodeEndpoint = "PLRL_OPENCODE_ENDPOINT"
	EnvOpenCodeModel    = "PLRL_OPENCODE_MODEL"
	EnvOpenCodeToken    = "PLRL_OPENCODE_TOKEN"

	EnvClaudeModel              = "PLRL_CLAUDE_MODEL"
	EnvClaudeToken              = "PLRL_CLAUDE_TOKEN"
	EnvClaudeArgs               = "PLRL_CLAUDE_ARGS"
	EnvClaudeBashDefaultTimeout = "PLRL_CLAUDE_BASH_DEFAULT_TIMEOUT"
	EnvClaudeBashMaxTimeout     = "PLRL_CLAUDE_BASH_MAX_TIMEOUT"
	EnvClaudeEndpoint           = "PLRL_CLAUDE_ENDPOINT"

	EnvGeminiModel             = "PLRL_GEMINI_MODEL"
	EnvGeminiAPIKey            = "PLRL_GEMINI_API_KEY"
	EnvGeminiInactivityTimeout = "PLRL_GEMINI_INACTIVITY_TIMEOUT"
	EnvGeminiEndpoint          = "PLRL_GEMINI_ENDPOINT"

	EnvCodexModel    = "PLRL_CODEX_MODEL"
	EnvCodexAPIKey   = "PLRL_CODEX_API_KEY"
	EnvCodexEndpoint = "PLRL_CODEX_ENDPOINT"

	EnvDindEnabled    = "PLRL_DIND_ENABLED"
	EnvBrowserEnabled = "PLRL_BROWSER_ENABLED"
	EnvExecTimeout    = "PLRL_EXEC_TIMEOUT"

	EnvGitProxy = "PLRL_GIT_PROXY"

	EnvExaMcpServers = "PLRL_EXA_MCP_SERVERS"
)

var (
	terminalRunStatuses = []console.AgentRunStatus{
		console.AgentRunStatusSuccessful,
		console.AgentRunStatusFailed,
		console.AgentRunStatusCancelled,
	}
)

// AgentRunReconciler is a controller for the AgentRun custom resource.
// It manages the lifecycle of individual agent runs by:
// 1. Creating pods to execute agent tasks
// 2. Monitoring pod status and updating AgentRun status
// 3. Reporting status back to Console API
type AgentRunReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    pluralclient.Client
	ConsoleURL       string
	DeployToken      string
	CacheSyncTimeout time.Duration
}

// SetupWithManager configures the controller with the manager.
func (r *AgentRunReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1, CacheSyncTimeout: r.CacheSyncTimeout}).
		For(&v1alpha1.AgentRun{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Pod{}).
		Complete(r)
}

func (r *AgentRunReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, retErr error) {
	logger := log.FromContext(ctx)

	run := &v1alpha1.AgentRun{}
	if err := r.Get(ctx, req.NamespacedName, run); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, run)
	if err != nil {
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	// Finalizer is needed to ensure that the Pod and Secret are cleaned up after the AgentRun reaches
	// a terminal state and will be deleted by the controller.
	// The object can be deleted before defer patches the status update with terminal state,
	// so we need to ensure that the finalizer is removed and the object is deleted to avoid orphaned resources.
	if run.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(run, AgentRunFinalizer) {
		controllerutil.AddFinalizer(run, AgentRunFinalizer)
	}
	if !run.GetDeletionTimestamp().IsZero() {
		controllerutil.RemoveFinalizer(run, AgentRunFinalizer)
		return ctrl.Result{}, nil
	}

	utils.MarkCondition(run.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	maxAgentPods := common.GetConfigurationManager().GetMaxAgentRunPods()
	activePods, err := r.getNumberOfActivePods(ctx)
	if err != nil {
		return ctrl.Result{}, err
	}

	apiAgentRun, err := r.ConsoleClient.GetAgentRun(ctx, run.GetAgentRunID())
	if err != nil {
		// If the error is different from not found, return it.
		if !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}

		// Agent run is gone, delete the Kubernetes resource.
		if err := r.Delete(ctx, run); err != nil && !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}

		return ctrl.Result{RequeueAfter: requeueAfterAgentRun}, nil
	}

	if activePods >= maxAgentPods && apiAgentRun.Status == console.AgentRunStatusPending {
		logger.V(2).Info("maximum number of active pods reached", "activePods", activePods, "maxAgentPods", maxAgentPods)
		return jitterRequeue(requeueAfter, jitter), nil
	}

	run.Status.ID = &apiAgentRun.ID
	run.Status.Phase = getAgentRunPhase(apiAgentRun.Status)

	if lo.Contains(terminalRunStatuses, apiAgentRun.Status) {
		// Agent run is in a terminal state, delete the Kubernetes resource.
		if err := r.Delete(ctx, run); err != nil && !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}

		return ctrl.Result{RequeueAfter: requeueAfterAgentRun}, nil
	}

	agentRuntime, err := r.getRuntime(ctx, run)
	if err != nil {
		utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return jitterRequeue(requeueWaitForResources, jitter), nil
	}
	if agentRuntime.DeletionTimestamp != nil {
		utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, "agent runtime is being deleted")
		return ctrl.Result{}, nil
	}
	if !agentRuntime.Status.HasID() {
		utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, "agent runtime is not ready")
		return jitterRequeue(requeueWaitForResources, jitter), nil
	}

	pod, err := r.reconcilePod(ctx, run, agentRuntime)
	if err != nil {
		utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if isAgentRunPodTimedOut(pod) {
		if err := r.Delete(ctx, pod); err != nil && !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}
		run.Status.Phase = v1alpha1.AgentRunPhaseCancelled
		if _, err := r.ConsoleClient.UpdateAgentRun(ctx, run.GetAgentRunID(), run.StatusAttributes(console.AgentRunStatusCancelled)); err != nil {
			return ctrl.Result{}, err
		}

		return jitterRequeue(requeueAfterAgentRun, jitter), nil
	}

	changed, sha, err := run.StatusDiff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate agent run SHA")
		utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if changed {
		_, err = r.ConsoleClient.UpdateAgentRun(ctx, run.GetAgentRunID(), run.StatusAttributes(apiAgentRun.Status))
		if err != nil {
			utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
	}
	run.Status.SHA = &sha

	utils.MarkCondition(run.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return jitterRequeue(requeueAfterAgentRun, jitter), nil
}

func (r *AgentRunReconciler) getNumberOfActivePods(ctx context.Context) (int, error) {
	metaList := &v1alpha1.AgentRunList{}
	if err := r.List(ctx, metaList); err != nil {
		return 0, err
	}
	activeRuns := 0
	for _, item := range metaList.Items {
		if item.DeletionTimestamp == nil && item.Status.PodRef != nil {
			activeRuns++
		}
	}
	return activeRuns, nil
}

func (r *AgentRunReconciler) getRuntime(ctx context.Context, run *v1alpha1.AgentRun) (runtime *v1alpha1.AgentRuntime, err error) {
	runtime = &v1alpha1.AgentRuntime{}
	err = r.Get(ctx, client.ObjectKey{Name: run.Spec.RuntimeRef.Name}, runtime)
	if err != nil {
		return nil, fmt.Errorf("failed to get agent runtime: %w", err)
	}

	return
}

func getAgentRunPhase(status console.AgentRunStatus) v1alpha1.AgentRunPhase {
	switch status {
	case console.AgentRunStatusRunning:
		return v1alpha1.AgentRunPhaseRunning
	case console.AgentRunStatusSuccessful:
		return v1alpha1.AgentRunPhaseSucceeded
	case console.AgentRunStatusFailed:
		return v1alpha1.AgentRunPhaseFailed
	case console.AgentRunStatusCancelled:
		return v1alpha1.AgentRunPhaseCancelled
	default:
		return v1alpha1.AgentRunPhasePending
	}
}

func isAgentRunPodTimedOut(pod *corev1.Pod) bool {
	if pod == nil {
		return false
	}
	// Don't time out pods that have already reached a terminal phase.
	if pod.Status.Phase == corev1.PodSucceeded || pod.Status.Phase == corev1.PodFailed {
		return false
	}
	if !pod.Status.StartTime.IsZero() {
		return time.Now().After(pod.Status.StartTime.Add(agentRunMaxLifetime))
	}
	if !pod.CreationTimestamp.IsZero() {
		return time.Now().After(pod.CreationTimestamp.Add(agentRunMaxLifetime))
	}
	return false
}

// reconcilePod ensures the pod for the agent run exists and is in the desired state.
func (r *AgentRunReconciler) reconcilePod(ctx context.Context, run *v1alpha1.AgentRun, runtime *v1alpha1.AgentRuntime) (*corev1.Pod, error) {
	secret, err := r.reconcilePodSecret(ctx, run, runtime)
	if err != nil {
		return nil, fmt.Errorf("failed to reconcile run secret: %w", err)
	}

	bootstrapCM, err := r.reconcileBootstrapConfigMap(ctx, run, runtime)
	if err != nil {
		return nil, fmt.Errorf("failed to reconcile bootstrap config map: %w", err)
	}

	pod := &corev1.Pod{}
	if err := r.Get(ctx, client.ObjectKey{Name: run.Name, Namespace: run.Namespace}, pod); err != nil {
		if !errors.IsNotFound(err) {
			return nil, fmt.Errorf("failed to get pod: %w", err)
		}
		pod = buildAgentRunPod(run, runtime)

		// Set the controller reference on the pod so that it can be garbage collected when the agent run is deleted.
		// Set before creating the pod so that the pod can be owned by the agent run.
		if err := controllerutil.SetControllerReference(run, pod, r.Scheme); err != nil {
			return nil, err
		}
		if err = r.Create(ctx, pod); err != nil {
			return nil, fmt.Errorf("failed to create pod: %w", err)
		}
	}

	run.Status.PodRef = &corev1.ObjectReference{Name: pod.Name, Namespace: pod.Namespace}

	// add owner ref to pod secret if it doesn't exist
	if err := utils.TryAddOwnerRef(ctx, r.Client, pod, secret, r.Scheme); err != nil {
		return pod, fmt.Errorf("failed to add owner ref: %w", err)
	}

	if bootstrapCM != nil {
		if err := utils.TryAddOwnerRef(ctx, r.Client, pod, bootstrapCM, r.Scheme); err != nil {
			return pod, fmt.Errorf("failed to add owner ref to bootstrap config map: %w", err)
		}
	}

	return pod, nil
}

// reconcileBootstrapConfigMap creates a ConfigMap holding the bootstrap script.
func (r *AgentRunReconciler) reconcileBootstrapConfigMap(ctx context.Context, run *v1alpha1.AgentRun, runtime *v1alpha1.AgentRuntime) (*corev1.ConfigMap, error) {
	if runtime.Spec.BootstrapScript == nil || len(*runtime.Spec.BootstrapScript) == 0 {
		return nil, nil
	}

	logger := log.FromContext(ctx)
	name := run.Name + "-bootstrap"

	cm := &corev1.ConfigMap{}
	if err := r.Get(ctx, types.NamespacedName{Name: name, Namespace: run.Namespace}, cm); err != nil {
		if !errors.IsNotFound(err) {
			return nil, fmt.Errorf("failed to get bootstrap config map: %w", err)
		}

		cm = &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: run.Namespace},
			Data: map[string]string{
				bootstrapScriptConfigMapKey: *runtime.Spec.BootstrapScript,
			},
		}

		logger.V(2).Info("creating bootstrap config map", "namespace", cm.Namespace, "name", cm.Name)
		if err = r.Create(ctx, cm); err != nil {
			return nil, fmt.Errorf("failed to create bootstrap config map: %w", err)
		}
	}

	return cm, nil
}

func (r *AgentRunReconciler) reconcilePodSecret(ctx context.Context, run *v1alpha1.AgentRun, runtime *v1alpha1.AgentRuntime) (*corev1.Secret, error) {
	logger := log.FromContext(ctx)

	config, err := r.getAgentRuntimeConfig(ctx, run.Namespace, runtime.Spec.Config)
	if err != nil {
		return nil, fmt.Errorf("failed to get agent runtime config: %w", err)
	}

	signingKey, err := r.resolveSigningKey(ctx, runtime)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve git signing key: %w", err)
	}

	var exaMcpConfigs []*v1alpha1.ExaMcpServerConfigRaw
	if len(runtime.Spec.ExaMcpServers) > 0 {
		exaMcpConfigs = make([]*v1alpha1.ExaMcpServerConfigRaw, 0, len(runtime.Spec.ExaMcpServers))
		for _, exaMcpServer := range runtime.Spec.ExaMcpServers {
			exaMcpConfig, err := r.getExaMcpConfig(ctx, run.Namespace, exaMcpServer)
			if err != nil {
				return nil, fmt.Errorf("failed to get exaMcp config for server %q: %w", exaMcpServer.Name, err)
			}
			exaMcpConfigs = append(exaMcpConfigs, exaMcpConfig)
		}
	}

	secret := &corev1.Secret{}
	if err := r.Get(ctx, types.NamespacedName{Name: run.Name, Namespace: run.Namespace}, secret); err != nil {
		if !errors.IsNotFound(err) {
			return nil, fmt.Errorf("failed to get secret: %w", err)
		}

		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: run.Name, Namespace: run.Namespace},
			StringData: r.getSecretData(run, config, runtime.Spec.Type, signingKey, exaMcpConfigs),
		}

		logger.V(2).Info("creating secret", "namespace", secret.Namespace, "name", secret.Name)
		if err = r.Create(ctx, secret); err != nil {
			return nil, fmt.Errorf("failed to create secret: %w", err)
		}

		return secret, nil
	}

	if !r.hasSecretData(secret.Data, run) {
		logger.V(2).Info("updating secret", "namespace", secret.Namespace, "name", secret.Name)
		secret.StringData = r.getSecretData(run, config, runtime.Spec.Type, signingKey, exaMcpConfigs)
		if err := r.Update(ctx, secret); err != nil {
			logger.Error(err, "unable to update secret")
			return nil, err
		}
	}

	return secret, nil
}

func (r *AgentRunReconciler) getExaMcpConfig(ctx context.Context, namespace string, config v1alpha1.ExaMcpServerConfig) (*v1alpha1.ExaMcpServerConfigRaw, error) {
	return config.ToExaMcpServerConfigRaw(func(selector corev1.SecretKeySelector) (*corev1.Secret, error) {
		secret := &corev1.Secret{}
		err := r.Get(ctx, client.ObjectKey{Namespace: namespace, Name: selector.Name}, secret)
		return secret, err
	})
}

func (r *AgentRunReconciler) getAgentRuntimeConfig(ctx context.Context, namespace string, config *v1alpha1.AgentRuntimeConfig) (*v1alpha1.AgentRuntimeConfigRaw, error) {
	if config == nil {
		return nil, nil
	}

	return config.ToAgentRuntimeConfigRaw(func(selector corev1.SecretKeySelector) (*corev1.Secret, error) {
		secret := &corev1.Secret{}
		err := r.Get(ctx, client.ObjectKey{Namespace: namespace, Name: selector.Name}, secret)
		return secret, err
	})
}

// resolveSigningKey fetches the signing key value from the secret referenced in runtime.Spec.Git.SigningKeyRef.
// It looks up the secret in the AgentRuntime's own namespace so that the source secret does not need
// to exist in the pod's TargetNamespace. The returned bytes are later copied into the pod secret.
func (r *AgentRunReconciler) resolveSigningKey(ctx context.Context, runtime *v1alpha1.AgentRuntime) ([]byte, error) {
	if runtime.Spec.Git == nil || runtime.Spec.Git.SigningKeyRef == nil {
		return nil, nil
	}

	ref := runtime.Spec.Git.SigningKeyRef
	s := &corev1.Secret{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: runtime.Spec.TargetNamespace, Name: ref.Name}, s); err != nil {
		return nil, fmt.Errorf("failed to get git signing key secret %q: %w", ref.Name, err)
	}

	value, ok := s.Data[ref.Key]
	if !ok {
		return nil, fmt.Errorf("key %q not found in secret %q", ref.Key, ref.Name)
	}

	return value, nil
}

func (r *AgentRunReconciler) getSecretData(run *v1alpha1.AgentRun, config *v1alpha1.AgentRuntimeConfigRaw, runtimeType console.AgentRuntimeType, signingKey []byte, exaMcpConfigs []*v1alpha1.ExaMcpServerConfigRaw) map[string]string {
	result := map[string]string{
		EnvConsoleURL:  r.ConsoleURL,
		EnvDeployToken: r.DeployToken,
		EnvAgentRunID:  run.Status.GetID(),
	}

	if len(signingKey) > 0 {
		result[gitSigningKeySecretKey] = string(signingKey)
	}

	if len(exaMcpConfigs) > 0 {
		b, err := json.Marshal(exaMcpConfigs)
		if err == nil {
			result[EnvExaMcpServers] = string(b)
		}
	}

	if config == nil {
		return result
	}

	if runtimeType == console.AgentRuntimeTypeOpencode {
		if config.OpenCode == nil {
			return result
		}

		result[EnvOpenCodeProvider] = config.OpenCode.Provider
		result[EnvOpenCodeEndpoint] = config.OpenCode.Endpoint
		result[EnvOpenCodeModel] = lo.FromPtr(config.OpenCode.Model)
		result[EnvOpenCodeToken] = config.OpenCode.Token
		if config.OpenCode.Timeout != nil {
			result[EnvExecTimeout] = config.OpenCode.Timeout.Duration.String()
		}
	}
	if runtimeType == console.AgentRuntimeTypeClaude {
		if config.Claude == nil {
			return result
		}
		if len(config.Claude.ExtraArgs) > 0 {
			var quoted []string
			for _, a := range config.Claude.ExtraArgs {
				quoted = append(quoted, strconv.Quote(a))
			}
			result[EnvClaudeArgs] = strings.Join(quoted, ",")
		}

		result[EnvClaudeModel] = lo.FromPtr(config.Claude.Model)
		result[EnvClaudeToken] = config.Claude.ApiKey
		if config.Claude.Timeout != nil {
			result[EnvExecTimeout] = config.Claude.Timeout.Duration.String()
		}

		if config.Claude.BashTimeout != nil {
			result[EnvClaudeBashDefaultTimeout] = config.Claude.BashTimeout.Duration.String()
		}

		if config.Claude.BashMaxTimeout != nil {
			result[EnvClaudeBashMaxTimeout] = config.Claude.BashMaxTimeout.Duration.String()
		}
		if config.Claude.Endpoint != nil {
			result[EnvClaudeEndpoint] = lo.FromPtr(config.Claude.Endpoint)
		}
	}

	if runtimeType == console.AgentRuntimeTypeGemini {
		if config.Gemini == nil {
			return result
		}

		result[EnvGeminiModel] = lo.FromPtr(config.Gemini.Model)
		result[EnvGeminiAPIKey] = config.Gemini.APIKey
		if config.Gemini.Timeout != nil {
			result[EnvExecTimeout] = config.Gemini.Timeout.Duration.String()
		}

		if config.Gemini.InactivityTimeout != nil {
			result[EnvGeminiInactivityTimeout] = config.Gemini.InactivityTimeout.Duration.String()
		}
		if config.Gemini.Endpoint != nil {
			result[EnvGeminiEndpoint] = lo.FromPtr(config.Gemini.Endpoint)
		}
	}
	if runtimeType == console.AgentRuntimeTypeCodex {
		if config.Codex == nil {
			return result
		}
		result[EnvCodexModel] = lo.FromPtr(config.Codex.Model)
		result[EnvCodexAPIKey] = config.Codex.ApiKey
		if config.Codex.Timeout != nil {
			result[EnvExecTimeout] = config.Codex.Timeout.Duration.String()
		}
		if config.Codex.Endpoint != nil {
			result[EnvCodexEndpoint] = lo.FromPtr(config.Codex.Endpoint)
		}
	}

	return result
}

func (r *AgentRunReconciler) hasSecretData(data map[string][]byte, run *v1alpha1.AgentRun) bool {
	token, hasToken := data[EnvDeployToken]
	url, hasUrl := data[EnvConsoleURL]
	id, hasID := data[EnvAgentRunID]
	return hasToken && hasUrl && hasID &&
		string(token) == r.DeployToken && string(url) == r.ConsoleURL && string(id) == run.Status.GetID()
}
