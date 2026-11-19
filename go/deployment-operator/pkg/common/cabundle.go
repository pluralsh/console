package common

import (
	"context"
	"fmt"
	"os"
	"sync"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	EnvSpawnedCAEnabled    = "PLURAL_SPAWNED_CA_ENABLED"
	EnvSpawnedCAConfigMap  = "PLURAL_SPAWNED_CA_CONFIGMAP"
	EnvSpawnedCASourceFile = "PLURAL_SPAWNED_CA_SOURCE_FILE"
	EnvSpawnedCAKey        = "PLURAL_SPAWNED_CA_KEY"

	DefaultSpawnedCAConfigMap  = "plural-ca-bundle"
	DefaultSpawnedCASourceFile = "/etc/ssl/certs/ca-certificates.crt"
	DefaultSpawnedCAKey        = "ca-certificates.crt"
	SpawnedCAVolumeName        = "plural-ca-bundle"
	SpawnedCAManagedByLabel    = "app.kubernetes.io/managed-by"
	SpawnedCAManagedByValue    = "deployment-operator"
	SpawnedCAComponentLabel    = "app.kubernetes.io/component"
	SpawnedCAComponentValue    = "ca-bundle"
)

var (
	spawnedCAMu     sync.RWMutex
	spawnedCALoaded bool
	spawnedCAConfig SpawnedCAConfig
)

// SpawnedCAConfig controls automatic CA ConfigMap replication and pod mounts
// for operator-created AgentRun / Stack / Sentinel workloads.
type SpawnedCAConfig struct {
	Enabled    bool
	ConfigMap  string
	SourceFile string
	Key        string
	loadErr    error
}

// GetSpawnedCAConfig returns the process-wide spawned CA settings (without PEM).
// PEM bytes are always re-read from SourceFile so rotated mounts take effect.
func GetSpawnedCAConfig() SpawnedCAConfig {
	spawnedCAMu.RLock()
	if spawnedCALoaded {
		cfg := spawnedCAConfig
		spawnedCAMu.RUnlock()
		return cfg
	}
	spawnedCAMu.RUnlock()

	spawnedCAMu.Lock()
	defer spawnedCAMu.Unlock()
	if !spawnedCALoaded {
		spawnedCAConfig = loadSpawnedCAConfig()
		spawnedCALoaded = true
	}
	return spawnedCAConfig
}

// SetSpawnedCAConfigForTest overrides the cached config (tests only).
func SetSpawnedCAConfigForTest(cfg SpawnedCAConfig) {
	spawnedCAMu.Lock()
	defer spawnedCAMu.Unlock()
	spawnedCAConfig = cfg
	spawnedCALoaded = true
}

func loadSpawnedCAConfig() SpawnedCAConfig {
	return SpawnedCAConfig{
		Enabled:    os.Getenv(EnvSpawnedCAEnabled) == "true",
		ConfigMap:  envOr(EnvSpawnedCAConfigMap, DefaultSpawnedCAConfigMap),
		SourceFile: envOr(EnvSpawnedCASourceFile, DefaultSpawnedCASourceFile),
		Key:        envOr(EnvSpawnedCAKey, DefaultSpawnedCAKey),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func readSpawnedCAPEM(cfg SpawnedCAConfig) ([]byte, error) {
	if cfg.loadErr != nil {
		return nil, cfg.loadErr
	}
	pem, err := os.ReadFile(cfg.SourceFile)
	if err != nil {
		return nil, fmt.Errorf("read spawned CA source %q: %w", cfg.SourceFile, err)
	}
	if len(pem) == 0 {
		return nil, fmt.Errorf("spawned CA source %q is empty", cfg.SourceFile)
	}
	return pem, nil
}

func isOperatorManagedCAConfigMap(cm *corev1.ConfigMap) bool {
	if cm.Labels == nil {
		return false
	}
	return cm.Labels[SpawnedCAManagedByLabel] == SpawnedCAManagedByValue &&
		cm.Labels[SpawnedCAComponentLabel] == SpawnedCAComponentValue
}

// EnsureSpawnedCAConfigMap creates or updates the CA ConfigMap in namespace.
func EnsureSpawnedCAConfigMap(ctx context.Context, c client.Client, namespace string) error {
	cfg := GetSpawnedCAConfig()
	if !cfg.Enabled {
		return nil
	}

	pem, err := readSpawnedCAPEM(cfg)
	if err != nil {
		return err
	}

	desiredLabels := map[string]string{
		"app.kubernetes.io/name": SpawnedCAManagedByValue,
		SpawnedCAManagedByLabel:  SpawnedCAManagedByValue,
		SpawnedCAComponentLabel:  SpawnedCAComponentValue,
	}

	existing := &corev1.ConfigMap{}
	err = c.Get(ctx, client.ObjectKey{Name: cfg.ConfigMap, Namespace: namespace}, existing)
	if apierrors.IsNotFound(err) {
		desired := &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      cfg.ConfigMap,
				Namespace: namespace,
				Labels:    desiredLabels,
			},
			Data: map[string]string{
				cfg.Key: string(pem),
			},
		}
		if err := c.Create(ctx, desired); err != nil {
			return fmt.Errorf("create spawned CA configmap: %w", err)
		}
		return nil
	}
	if err != nil {
		return fmt.Errorf("get spawned CA configmap: %w", err)
	}

	if !isOperatorManagedCAConfigMap(existing) {
		return fmt.Errorf("configmap %s/%s exists but is not managed by deployment-operator; refuse to overwrite", namespace, cfg.ConfigMap)
	}

	if existing.Data != nil && existing.Data[cfg.Key] == string(pem) {
		return nil
	}
	if existing.Data == nil {
		existing.Data = map[string]string{}
	}
	existing.Data[cfg.Key] = string(pem)
	if existing.Labels == nil {
		existing.Labels = map[string]string{}
	}
	for k, v := range desiredLabels {
		existing.Labels[k] = v
	}
	if err := c.Update(ctx, existing); err != nil {
		return fmt.Errorf("update spawned CA configmap: %w", err)
	}
	return nil
}

// ApplySpawnedCAToPodSpec injects the CA volume and mounts onto every container
// and init container when spawned CA injection is enabled.
func ApplySpawnedCAToPodSpec(spec *corev1.PodSpec) {
	cfg := GetSpawnedCAConfig()
	if !cfg.Enabled || spec == nil {
		return
	}

	mountPath := "/etc/ssl/certs/" + cfg.Key
	mount := corev1.VolumeMount{
		Name:      SpawnedCAVolumeName,
		MountPath: mountPath,
		SubPath:   cfg.Key,
		ReadOnly:  true,
	}

	spec.Volumes = ensureSpawnedCAVolume(spec.Volumes, cfg)
	for i := range spec.Containers {
		spec.Containers[i].VolumeMounts = ensureSpawnedCAMount(spec.Containers[i].VolumeMounts, mount)
	}
	for i := range spec.InitContainers {
		spec.InitContainers[i].VolumeMounts = ensureSpawnedCAMount(spec.InitContainers[i].VolumeMounts, mount)
	}
}

func ensureSpawnedCAVolume(volumes []corev1.Volume, cfg SpawnedCAConfig) []corev1.Volume {
	for _, v := range volumes {
		if v.Name == SpawnedCAVolumeName {
			return volumes
		}
	}
	return append(volumes, corev1.Volume{
		Name: SpawnedCAVolumeName,
		VolumeSource: corev1.VolumeSource{
			ConfigMap: &corev1.ConfigMapVolumeSource{
				LocalObjectReference: corev1.LocalObjectReference{Name: cfg.ConfigMap},
				DefaultMode:          lo.ToPtr[int32](0644),
			},
		},
	})
}

func ensureSpawnedCAMount(mounts []corev1.VolumeMount, mount corev1.VolumeMount) []corev1.VolumeMount {
	for _, m := range mounts {
		if m.Name == SpawnedCAVolumeName || m.MountPath == mount.MountPath {
			return mounts
		}
	}
	return append(mounts, mount)
}
