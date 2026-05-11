package discovery

import (
	"strings"
	"sync"

	"github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/log"
)

const (
	ServiceMeshResourcePriorityIstio ServiceMeshResourcePriority = iota
	ServiceMeshResourcePriorityCilium
	ServiceMeshResourcePriorityLinkerd
	ServiceMeshResourcePriorityNone = 255

	ServiceMeshUpdateTypeAdded   ServiceMeshUpdateType = 0
	ServiceMeshUpdateTypeDeleted ServiceMeshUpdateType = 1

	// ServiceMeshResourceGroupIstio is a base group name used by Istio
	// Ref: https://github.com/istio/istio/blob/6186a80cb220ecbd7e1cc82044fe3a6fc2876c63/operator/pkg/apis/register.go#L27-L31
	ServiceMeshResourceGroupIstio ServiceMeshResourceGroup = "istio.io"

	// ServiceMeshResourceGroupCilium is a base group name used by Cilium
	// Ref: https://github.com/cilium/cilium/blob/99b4bc0d0b628f22c024f3ea74ef21007a831f52/pkg/k8s/apis/cilium.io/register.go#L7-L8
	ServiceMeshResourceGroupCilium ServiceMeshResourceGroup = "cilium.io"

	// ServiceMeshResourceGroupLinkerd is a base group name used by Linkerd
	// Ref: https://github.com/linkerd/linkerd2/blob/e055c32f31ae7618281fed1eb5c304b0d1389a52/controller/gen/apis/serviceprofile/register.go#L3-L4
	ServiceMeshResourceGroupLinkerd ServiceMeshResourceGroup = "linkerd.io"

	// ServiceMeshResourceGroupNone represents an empty or unknown service mesh
	ServiceMeshResourceGroupNone ServiceMeshResourceGroup = ""
)

var (
	serviceMesh       = ServiceMeshResourceGroupNone
	serviceMeshRWLock = sync.RWMutex{}
)

// ServiceMeshResourcePriority determines the order in which the ServiceMeshResourceGroup
// is assigned. Lower number means higher priority.
type ServiceMeshResourcePriority uint8

// ServiceMeshResourceGroup represents a group name used by a service mesh.
type ServiceMeshResourceGroup string

// ServiceMeshUpdateType represents the type of update that happened to the service mesh.
type ServiceMeshUpdateType uint8

func (in ServiceMeshResourceGroup) String() string {
	return string(in)
}

func (in ServiceMeshResourceGroup) Priority() ServiceMeshResourcePriority {
	switch in {
	case ServiceMeshResourceGroupIstio:
		return ServiceMeshResourcePriorityIstio
	case ServiceMeshResourceGroupCilium:
		return ServiceMeshResourcePriorityCilium
	case ServiceMeshResourceGroupLinkerd:
		return ServiceMeshResourcePriorityLinkerd
	default:
		return ServiceMeshResourcePriorityNone
	}
}

func UpdateServiceMesh(group string, updateType ServiceMeshUpdateType) {
	serviceMeshRWLock.Lock()
	defer serviceMeshRWLock.Unlock()

	newServiceMesh := ServiceMeshResourceGroupNone

	switch {
	case strings.Contains(group, ServiceMeshResourceGroupIstio.String()):
		newServiceMesh = ServiceMeshResourceGroupIstio
	case strings.Contains(group, ServiceMeshResourceGroupCilium.String()):
		newServiceMesh = ServiceMeshResourceGroupCilium
	case strings.Contains(group, ServiceMeshResourceGroupLinkerd.String()):
		newServiceMesh = ServiceMeshResourceGroupLinkerd
	}

	if newServiceMesh == ServiceMeshResourceGroupNone {
		return
	}

	// If the current service mesh is deleted, reset the service mesh to None.
	if updateType == ServiceMeshUpdateTypeDeleted && newServiceMesh == serviceMesh {
		klog.V(log.LogLevelInfo).InfoS("service mesh reset to none since its' group was deleted", "group", group)
		serviceMesh = ServiceMeshResourceGroupNone
		return
	}

	// Lower number means higher priority, so override only if
	// new resource group name matches service mesh with lower
	// priority number and the update type is not a delete.
	if serviceMesh.Priority() <= newServiceMesh.Priority() || updateType == ServiceMeshUpdateTypeDeleted {
		return
	}

	klog.V(log.LogLevelInfo).InfoS("service mesh updated", "group", group, "old", serviceMesh, "new", newServiceMesh)
	serviceMesh = newServiceMesh
}

func ServiceMesh(hasEBPFDaemonSet bool) *client.ServiceMesh {
	if hasEBPFDaemonSet {
		return lo.ToPtr(client.ServiceMeshEbpf)
	}

	serviceMeshRWLock.RLock()
	defer serviceMeshRWLock.RUnlock()

	switch serviceMesh {
	case ServiceMeshResourceGroupIstio:
		return lo.ToPtr(client.ServiceMeshIstio)
	case ServiceMeshResourceGroupCilium:
		return lo.ToPtr(client.ServiceMeshCilium)
	case ServiceMeshResourceGroupLinkerd:
		return lo.ToPtr(client.ServiceMeshLinkerd)
	default:
		return nil
	}
}
