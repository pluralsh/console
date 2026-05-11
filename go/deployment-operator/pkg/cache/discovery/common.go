package discovery

import (
	appsv1 "k8s.io/api/apps/v1"
)

const (
	appNameLabel = "app.kubernetes.io/name"
	ebpfAppName  = "opentelemetry-ebpf"
)

func IsEBPFDaemonSet(ds appsv1.DaemonSet) bool {
	value, ok := ds.Labels[appNameLabel]
	return ok && value == ebpfAppName
}
