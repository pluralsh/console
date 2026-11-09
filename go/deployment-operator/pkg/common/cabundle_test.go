package common

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
)

func TestApplySpawnedCAToPodSpec(t *testing.T) {
	SetSpawnedCAConfigForTest(SpawnedCAConfig{
		Enabled:   true,
		ConfigMap: "plural-ca-bundle",
		Key:       "ca-certificates.crt",
		PEM:       []byte("pem"),
	})
	t.Cleanup(func() {
		SetSpawnedCAConfigForTest(SpawnedCAConfig{})
	})

	spec := &corev1.PodSpec{
		Containers: []corev1.Container{
			{Name: "default"},
			{Name: "sidecar"},
		},
		InitContainers: []corev1.Container{
			{Name: "agent-bootstrap"},
		},
	}

	ApplySpawnedCAToPodSpec(spec)

	require.Len(t, spec.Volumes, 1)
	require.Equal(t, SpawnedCAVolumeName, spec.Volumes[0].Name)
	require.NotNil(t, spec.Volumes[0].ConfigMap)
	require.Equal(t, "plural-ca-bundle", spec.Volumes[0].ConfigMap.Name)

	for _, c := range append(spec.Containers, spec.InitContainers...) {
		require.Len(t, c.VolumeMounts, 1)
		require.Equal(t, SpawnedCAVolumeName, c.VolumeMounts[0].Name)
		require.Equal(t, "/etc/ssl/certs/ca-certificates.crt", c.VolumeMounts[0].MountPath)
		require.Equal(t, "ca-certificates.crt", c.VolumeMounts[0].SubPath)
	}

	ApplySpawnedCAToPodSpec(spec)
	require.Len(t, spec.Volumes, 1)
	require.Len(t, spec.Containers[0].VolumeMounts, 1)
}

func TestLoadSpawnedCAConfigReadsPEM(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "ca-certificates.crt")
	require.NoError(t, os.WriteFile(path, []byte("-----BEGIN CERTIFICATE-----\nX\n-----END CERTIFICATE-----\n"), 0o644))

	t.Setenv(EnvSpawnedCAEnabled, "true")
	t.Setenv(EnvSpawnedCASourceFile, path)
	t.Setenv(EnvSpawnedCAConfigMap, "custom-bundle")

	cfg := loadSpawnedCAConfig()
	require.True(t, cfg.Enabled)
	require.Equal(t, "custom-bundle", cfg.ConfigMap)
	require.Contains(t, string(cfg.PEM), "BEGIN CERTIFICATE")
}
