package common

import (
	"bytes"
	"fmt"
	"strings"

	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/getter"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/klog/v2"
)

type Option func(config *ChartLoadConfig)
type ChartLoadConfig struct {
	localPath string
	ociPath   string
}

func WithLocalPath(path string) Option {
	return func(config *ChartLoadConfig) {
		config.localPath = path
	}
}

func WithOCIPath(path string) Option {
	return func(config *ChartLoadConfig) {
		config.ociPath = path
	}
}

func loadOCIChart(url string) (*chart.Chart, error) {
	klog.V(LogLevel()).InfoS("Loading OCI chart from remote", "url", url)
	get, err := getter.NewOCIGetter()
	if err != nil {
		return nil, err
	}

	resp, err := get.Get(url)
	if err != nil {
		return nil, err
	}

	return loader.LoadArchive(resp)
}

func LoadChart(option ...Option) (*chart.Chart, error) {
	config := &ChartLoadConfig{}
	for _, opt := range option {
		opt(config)
	}

	if len(config.localPath) > 0 {
		klog.V(LogLevel()).InfoS("Loading local chart", "path", config.localPath)
		return loader.Load(config.localPath)
	}

	if len(config.ociPath) > 0 {
		return loadOCIChart(config.ociPath)
	}

	return nil, fmt.Errorf("no chart path provided")
}

// RenderChart takes the chart and runs a helm dry run. It does not set namespace.
func RenderChart(chart *chart.Chart, values map[string]interface{}) ([]*unstructured.Unstructured, error) {
	if values == nil {
		klog.V(LogLevel()).Info("Values not provided, using default values.yaml")
		values = chart.Values
	}

	installer, err := newDryRunAction(chart.Name())
	if err != nil {
		return nil, err
	}

	release, err := installer.Run(chart, values)
	if err != nil {
		return nil, err
	}

	var buffer bytes.Buffer
	_, err = fmt.Fprintln(&buffer, strings.TrimSpace(release.Manifest))
	if err != nil {
		return nil, err
	}

	manifests, err := fromManifestsReader(bytes.NewReader(buffer.Bytes()))
	if err != nil {
		return nil, err
	}

	return manifests, nil
}

func newDryRunAction(releaseName string) (*action.Install, error) {
	config := new(action.Configuration)
	if err := config.Init(nil, "", "", nil); err != nil {
		return nil, err
	}

	installer := action.NewInstall(config)
	installer.DryRun = true
	installer.ReleaseName = releaseName
	installer.Replace = true
	installer.ClientOnly = true
	installer.IncludeCRDs = true
	installer.IsUpgrade = false

	return installer, nil
}
