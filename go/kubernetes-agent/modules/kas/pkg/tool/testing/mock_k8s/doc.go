package mock_k8s

//go:generate mockgen.sh -destination "resource.go" -package "mock_k8s" "k8s.io/cli-runtime/pkg/resource" "RESTClientGetter"
//go:generate mockgen.sh -destination "meta.go" -package "mock_k8s" "k8s.io/apimachinery/pkg/api/meta" "ResettableRESTMapper"
//go:generate mockgen.sh -destination "cache.go" -package "mock_k8s" "k8s.io/client-go/tools/cache" "Indexer,GenericLister,GenericNamespaceLister"
//go:generate mockgen.sh -destination "dynamic.go" -package "mock_k8s" "k8s.io/client-go/dynamic" "NamespaceableResourceInterface,ResourceInterface"
//go:generate mockgen.sh -destination "core_v1.go" -package "mock_k8s" "k8s.io/client-go/kubernetes/typed/core/v1" "CoreV1Interface,SecretInterface"
//go:generate mockgen.sh -destination "workqueue.go" -package "mock_k8s" -mock_names "RateLimitingInterface=MockRateLimitingWorkqueue" "k8s.io/client-go/util/workqueue" "RateLimitingInterface"
//go:generate mockgen.sh -destination "apiextensionclient_v1.go" -package "mock_k8s" "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset/typed/apiextensions/v1" "ApiextensionsV1Interface,CustomResourceDefinitionInterface"
//go:generate mockgen.sh -destination "kubectl_cmd_util.go" -package "mock_k8s" "k8s.io/kubectl/pkg/cmd/util" "Factory"
