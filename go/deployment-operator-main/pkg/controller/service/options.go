package service

import (
	"time"

	"github.com/pluralsh/deployment-operator/pkg/streamline"
)

type ServiceReconcilerOption func(*ServiceReconciler)

func WithManifestTTL(manifestTTL time.Duration) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.manifestTTL = manifestTTL
	}
}

func WithManifestTTLJitter(manifestTTLJitter time.Duration) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.manifestTTLJitter = manifestTTLJitter
	}
}

func WithWorkqueueBaseDelay(workqueueBaseDelay time.Duration) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.workqueueBaseDelay = workqueueBaseDelay
	}
}

func WithWorkqueueMaxDelay(workqueueMaxDelay time.Duration) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.workqueueMaxDelay = workqueueMaxDelay
	}
}

func WithWorkqueueQPS(workqueueQPS int) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.workqueueQPS = workqueueQPS
	}
}

func WithWorkqueueBurst(workqueueBurst int) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.workqueueBurst = workqueueBurst
	}
}

func WithRestoreNamespace(namespace string) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.restoreNamespace = namespace
	}
}

func WithConsoleURL(url string) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.consoleURL = url
	}
}

func WithPollInterval(pollInterval time.Duration) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.pollInterval = pollInterval
	}
}

func WithWaveDelay(waveDelay time.Duration) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.waveDelay = waveDelay
	}
}

func WithSupervisor(supervisor *streamline.Supervisor) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.supervisor = supervisor
	}
}

func WithWaveMaxConcurrentApplies(n int) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.waveMaxConcurrentApplies = n
	}
}

func WithWaveDeQueueDelay(delay time.Duration) ServiceReconcilerOption {
	return func(r *ServiceReconciler) {
		r.waveDeQueueDelay = delay
	}
}
