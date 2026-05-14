package helm

type Option func(*Helm)

func WithRepository(repository string) Option {
	return func(h *Helm) {
		h.repository = repository
	}
}

func WithReleaseName(releaseName string) Option {
	return func(h *Helm) {
		h.releaseName = releaseName
	}
}

func WithReleaseNamespace(releaseNamespace string) Option {
	return func(h *Helm) {
		h.releaseNamespace = releaseNamespace
	}
}

func WithChartName(chartName string) Option {
	return func(h *Helm) {
		h.chartName = chartName
	}
}

func WithKubeconfig(kubeconfig string) Option {
	return func(h *Helm) {
		h.kubeconfig = &kubeconfig
	}
}

func WithValues(values map[string]interface{}) Option {
	return func(h *Helm) {
		if values == nil {
			return
		}

		h.values = values
	}
}
