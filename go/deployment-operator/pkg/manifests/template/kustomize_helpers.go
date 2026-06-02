package template

import (
	"path/filepath"

	"sigs.k8s.io/kustomize/api/krusty"
	"sigs.k8s.io/kustomize/api/types"
)

func makeKrustyOptions(enableHelm bool) *krusty.Options {
	opts := krusty.MakeDefaultOptions()
	opts.LoadRestrictions = types.LoadRestrictionsNone
	opts.PluginConfig.HelmConfig.Enabled = enableHelm
	opts.PluginConfig.HelmConfig.Command = "helm"
	return opts
}

func isKustomizationFile(name string) bool {
	if name == "" {
		return false
	}
	switch filepath.Base(name) {
	case "kustomization.yaml", "kustomization.yml", "Kustomization":
		return true
	default:
		return false
	}
}
