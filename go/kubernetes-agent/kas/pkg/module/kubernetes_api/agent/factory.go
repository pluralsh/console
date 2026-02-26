package agent

import (
	"fmt"
	"net/url"

	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"

	"github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api"
	"github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
)

type Factory struct {
}

func (f *Factory) IsProducingLeaderModules() bool {
	return false
}

func (f *Factory) New(config *modagent.Config) (modagent.Module, error) {
	restConfig, err := config.K8sUtilFactory.ToRESTConfig()
	if err != nil {
		return nil, err
	}
	restConfig = rest.CopyConfig(restConfig)
	// Clients and the server already do rate limiting. agentk doesn't need to add an extra layer.
	// See https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
	restConfig.QPS = -1
	baseUrl, _, err := defaultServerUrlFor(restConfig)
	if err != nil {
		return nil, err
	}
	userAgent := fmt.Sprintf("%s/%s/%s", config.AgentName, config.AgentMeta.Version, config.AgentMeta.CommitId)
	s := newServer(restConfig, baseUrl, userAgent)
	rpc.RegisterKubernetesApiServer(config.Server, s)
	return &module{}, nil
}

func (f *Factory) Name() string {
	return kubernetes_api.ModuleName
}

func (f *Factory) StartStopPhase() modshared.ModuleStartStopPhase {
	// This module exposes an API endpoint on the internal server, but it does not make requests to it.
	return modshared.ModuleStartBeforeServers
}

// This is a copy from k8s.io/client-go/rest/url_utils.go

// defaultServerUrlFor is shared between IsConfigTransportTLS and RESTClientFor. It
// requires Host and Version to be set prior to being called.
func defaultServerUrlFor(config *rest.Config) (*url.URL, string, error) {
	// TODO: move the default to secure when the apiserver supports TLS by default
	// config.Insecure is taken to mean "I want HTTPS but don't bother checking the certs against a CA."
	hasCA := len(config.CAFile) != 0 || len(config.CAData) != 0
	hasCert := len(config.CertFile) != 0 || len(config.CertData) != 0
	defaultTLS := hasCA || hasCert || config.Insecure
	host := config.Host
	if host == "" {
		host = "localhost"
	}

	if config.GroupVersion != nil {
		return rest.DefaultServerURL(host, config.APIPath, *config.GroupVersion, defaultTLS)
	}
	return rest.DefaultServerURL(host, config.APIPath, schema.GroupVersion{}, defaultTLS)
}
