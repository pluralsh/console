package common

// Kubernetes resource groups
const (
	GroupCore       = ""
	GroupApps       = "apps"
	GroupNetworking = "networking.k8s.io"
)

// Kubernetes kinds
const (
	KindDeployment  = "Deployment"
	KindStatefulSet = "StatefulSet"
	KindService     = "Service"
	KindIngress     = "Ingress"
)
