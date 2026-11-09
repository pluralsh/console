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
	PEM        []byte
}

// GetSpawnedCAConfig returns the process-wide spawned CA configuration, loading
// PEM from the operator filesystem once when enabled.
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
	cfg := SpawnedCAConfig{
		Enabled:    os.Getenv(EnvSpawnedCAEnabled) == "true",
		ConfigMap:  envOr(EnvSpawnedCAConfigMap, DefaultSpawnedCAConfigMap),
		SourceFile: envOr(EnvSpawnedCASourceFile, DefaultSpawnedCASourceFile),
		Key:        envOr(EnvSpawnedCAKey, DefaultSpawnedCAKey),
	}
	if !cfg.Enabled {
		return cfg
	}

	pem, err := os.ReadFile(cfg.SourceFile)
	if err != nil || len(pem) == 0 {
		cfg.Enabled = false
		return cfg
	}
	cfg.PEM = pem
	return cfg
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// EnsureSpawnedCAConfigMap creates or updates the CA ConfigMap in namespace.
func EnsureSpawnedCAConfigMap(ctx context.Context, c client.Client, namespace string) error {
	cfg := GetSpawnedCAConfig()
	if !cfg.Enabled {
		return nil
	}

	desired := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      cfg.ConfigMap,
			Namespace: namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":       "deployment-operator",
				"app.kubernetes.io/managed-by": "deployment-operator",
				"app.kubernetes.io/component":  "ca-bundle",
			},
		},
		Data: map[string]string{
			cfg.Key: string(cfg.PEM),
		},
	}

	existing := &corev1.ConfigMap{}
	err := c.Get(ctx, client.ObjectKey{Name: cfg.ConfigMap, Namespace: namespace}, existing)
	if apierrors.IsNotFound(err) {
		if err := c.Create(ctx, desired); err != nil {
			return fmt.Errorf("create spawned CA configmap: %w", err)
		}
		return nil
	}
	if err != nil {
		return fmt.Errorf("get spawned CA configmap: %w", err)
	}

	if existing.Data != nil && existing.Data[cfg.Key] == string(cfg.PEM) {
		return nil
	}
	existing.Data = desired.Data
	if existing.Labels == nil {
		existing.Labels = map[string]string{}
	}
	for k, v := range desired.Labels {
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

	mount := corev1.VolumeMount{
		Name:      SpawnedCAVolumeName,
		MountPath: "/etc/ssl/certs/" + cfg.Key,
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
		if m.Name == SpawnedCAVolumeName {
			return mounts
		}
	}
	return append(mounts, mount)
}
