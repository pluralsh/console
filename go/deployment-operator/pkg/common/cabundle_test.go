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

func TestApplySpawnedCAToPodSpecSkipsExistingMountPath(t *testing.T) {
	SetSpawnedCAConfigForTest(SpawnedCAConfig{
		Enabled:   true,
		ConfigMap: "plural-ca-bundle",
		Key:       "ca-certificates.crt",
	})
	t.Cleanup(func() {
		SetSpawnedCAConfigForTest(SpawnedCAConfig{})
	})

	spec := &corev1.PodSpec{
		Containers: []corev1.Container{{
			Name: "default",
			VolumeMounts: []corev1.VolumeMount{{
				Name:      "manual-ca",
				MountPath: "/etc/ssl/certs/ca-certificates.crt",
				SubPath:   "ca-certificates.crt",
				ReadOnly:  true,
			}},
		}},
	}

	ApplySpawnedCAToPodSpec(spec)
	require.Len(t, spec.Containers[0].VolumeMounts, 1)
	require.Equal(t, "manual-ca", spec.Containers[0].VolumeMounts[0].Name)
}

func TestLoadSpawnedCAConfigReadsSettings(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "ca-certificates.crt")
	require.NoError(t, os.WriteFile(path, []byte("-----BEGIN CERTIFICATE-----\nX\n-----END CERTIFICATE-----\n"), 0o644))

	t.Setenv(EnvSpawnedCAEnabled, "true")
	t.Setenv(EnvSpawnedCASourceFile, path)
	t.Setenv(EnvSpawnedCAConfigMap, "custom-bundle")

	cfg := loadSpawnedCAConfig()
	require.True(t, cfg.Enabled)
	require.Equal(t, "custom-bundle", cfg.ConfigMap)
	require.Equal(t, path, cfg.SourceFile)

	pem, err := readSpawnedCAPEM(cfg)
	require.NoError(t, err)
	require.Contains(t, string(pem), "BEGIN CERTIFICATE")
}

func TestSpawnedCASourceChecksum(t *testing.T) {
	SetSpawnedCAConfigForTest(SpawnedCAConfig{})
	sum, err := SpawnedCASourceChecksum()
	require.NoError(t, err)
	require.Empty(t, sum)

	path := filepath.Join(t.TempDir(), "ca.crt")
	require.NoError(t, os.WriteFile(path, []byte("pem-bytes"), 0o644))
	SetSpawnedCAConfigForTest(SpawnedCAConfig{
		Enabled:    true,
		SourceFile: path,
		Key:        DefaultSpawnedCAKey,
	})
	t.Cleanup(func() { SetSpawnedCAConfigForTest(SpawnedCAConfig{}) })

	sum, err = SpawnedCASourceChecksum()
	require.NoError(t, err)
	require.NotEmpty(t, sum)
}

func TestReadSpawnedCAPEMReportsMissingFile(t *testing.T) {
	_, err := readSpawnedCAPEM(SpawnedCAConfig{
		Enabled:    true,
		SourceFile: "/tmp/does-not-exist-plural-ca.crt",
		Key:        DefaultSpawnedCAKey,
	})
	require.Error(t, err)
}
