// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"crypto/elliptic"
	"crypto/tls"
	"net/http"
	"time"

	restfulspec "github.com/emicklei/go-restful-openapi/v2"
	"github.com/emicklei/go-restful/v3"
	"github.com/go-openapi/spec"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"k8s.io/klog/v2"

	"github.com/pluralsh/kubernetes-agent/api/pkg/args"
	"github.com/pluralsh/kubernetes-agent/api/pkg/environment"
	"github.com/pluralsh/kubernetes-agent/api/pkg/handler"
	"github.com/pluralsh/kubernetes-agent/api/pkg/integration"
	integrationapi "github.com/pluralsh/kubernetes-agent/api/pkg/integration/api"
	"github.com/pluralsh/kubernetes-agent/common/certificates"
	"github.com/pluralsh/kubernetes-agent/common/certificates/ecdsa"
	"github.com/pluralsh/kubernetes-agent/common/client"
)

func main() {
	if args.IsVersionRequested() {
		klog.InfoS("Kubernetes Dashboard API", "version", environment.Version)
		return
	}

	klog.InfoS("Starting Kubernetes Dashboard API", "version", environment.Version)

	client.Init(
		client.WithUserAgent(environment.UserAgent()),
		client.WithKubeconfig(args.KubeconfigPath()),
		client.WithMasterUrl(args.ApiServerHost()),
		client.WithInsecureTLSSkipVerify(args.ApiServerSkipTLSVerify()),
		client.WithCaBundle(args.ApiServerCaBundle()),
	)

	if !args.IsProxyEnabled() {
		ensureAPIServerConnectionOrDie()
	} else {
		klog.Info("Running in proxy mode. InClusterClient connections will be disabled.")
	}

	// Init integrations
	integrationManager := integration.NewIntegrationManager()

	if !args.IsProxyEnabled() {
		configureMetricsProvider(integrationManager)
	} else {
		klog.Info("Skipping metrics configuration. Metrics not available in proxy mode.")
	}

	apiHandler, err := handler.CreateHTTPAPIHandler(integrationManager)
	if err != nil {
		handleFatalInitError(err)
	}

	if args.IsOpenAPIEnabled() {
		klog.Info("Enabling OpenAPI endpoint on /apidocs.json")
		configureOpenAPI(apiHandler)
	}

	certCreator := ecdsa.NewECDSACreator(args.KeyFile(), args.CertFile(), elliptic.P256())
	certManager := certificates.NewCertManager(certCreator, args.DefaultCertDir(), args.AutogenerateCertificates())
	certs, err := certManager.GetCertificates()
	if err != nil {
		handleFatalInitServingCertError(err)
	}

	http.Handle("/", apiHandler)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})
	http.Handle("/api/sockjs/", handler.CreateAttachHandler("/api/sockjs"))
	http.Handle("/metrics", promhttp.Handler())

	if certs != nil {
		serveTLS(certs)
	} else {
		serve()
	}

	select {}
}

func serve() {
	klog.V(1).InfoS("Listening and serving on", "address", args.InsecureAddress())
	go func() { klog.Fatal(http.ListenAndServe(args.InsecureAddress(), nil)) }()
}

func serveTLS(certificates []tls.Certificate) {
	klog.V(1).InfoS("Listening and serving on", "address", args.Address())
	server := &http.Server{
		Addr:    args.Address(),
		Handler: http.DefaultServeMux,
		TLSConfig: &tls.Config{
			Certificates: certificates,
			MinVersion:   tls.VersionTLS12,
		},
	}
	go func() { klog.Fatal(server.ListenAndServeTLS("", "")) }()
}

func ensureAPIServerConnectionOrDie() {
	versionInfo, err := client.InClusterClient().Discovery().ServerVersion()
	if err != nil {
		handleFatalInitError(err)
	}

	klog.InfoS("Successful initial request to the apiserver", "version", versionInfo.String())
}

func configureMetricsProvider(integrationManager integration.Manager) {
	switch metricsProvider := args.MetricsProvider(); metricsProvider {
	case "sidecar":
		integrationManager.Metric().ConfigureSidecar(args.SidecarHost()).
			EnableWithRetry(integrationapi.SidecarIntegrationID, time.Duration(args.MetricClientHealthCheckPeriod()))
	case "none":
		klog.Info("Metrics provider disabled")
	default:
		klog.InfoS("Invalid metrics provider", "provider", metricsProvider)
		klog.Info("Using default metrics provider", "provider", "sidecar")
		integrationManager.Metric().ConfigureSidecar(args.SidecarHost()).
			EnableWithRetry(integrationapi.SidecarIntegrationID, time.Duration(args.MetricClientHealthCheckPeriod()))
	}
}

func configureOpenAPI(container *restful.Container) {
	config := restfulspec.Config{
		WebServices:                   container.RegisteredWebServices(),
		APIPath:                       "/apidocs.json",
		PostBuildSwaggerObjectHandler: enrichOpenAPIObject,
	}
	container.Add(restfulspec.NewOpenAPIService(config))
}

func enrichOpenAPIObject(swo *spec.Swagger) {
	swo.Info = &spec.Info{
		InfoProps: spec.InfoProps{
			Title:   "Kubernetes Dashboard API",
			Version: environment.Version,
		},
	}

	// Fix v1.Time definition: metav1.Time has a custom MarshalJSON that returns
	// a string (RFC3339 format), not a structure with nested fields.
	// The swagger generator incorrectly creates an object schema, so we override it.
	if swo.Definitions != nil {
		if _, exists := swo.Definitions["v1.Time"]; exists {
			swo.Definitions["v1.Time"] = spec.Schema{
				SchemaProps: spec.SchemaProps{
					Type:   []string{"string"},
					Format: "date-time",
				},
			}
		}
	}
}

/**
 * Handles fatal init error that prevents server from doing any work. Prints verbose error
 * message and quits the server.
 */
func handleFatalInitError(err error) {
	klog.Fatalf("Error while initializing connection to Kubernetes apiserver. "+
		"This most likely means that the cluster is misconfigured (e.g., it has "+
		"invalid apiserver certificates or service account's configuration) or the "+
		"--apiserver-host param points to a server that does not exist. Reason: %s\n"+
		"Refer to our FAQ and wiki pages for more information: "+
		"https://github.com/kubernetes/dashboard/wiki/FAQ", err)
}

/**
 * Handles fatal init errors encountered during service cert loading.
 */
func handleFatalInitServingCertError(err error) {
	klog.Fatalf("Error while loading dashboard server certificates. Reason: %s", err)
}
