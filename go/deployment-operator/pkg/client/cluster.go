package client

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/containers"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/klog/v2"

	internalerrors "github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

const (
	certManagerServiceName  = "cert-manager"
	ebsCsiDriverServiceName = "aws-ebs-csi-driver"
	externalDNSServiceName  = "external-dns"
	linkerdServiceName      = "Linkerd"
	istioServiceName        = "istio"
	CiliumServiceName       = "cilium"
)

var mapRuntimeService = map[string]string{
	"istiod":          istioServiceName,
	"cilium-operator": CiliumServiceName,
}

func (c *client) PingCluster(attributes console.ClusterPing) error {
	_, err := c.consoleClient.PingCluster(c.ctx, attributes)
	return err
}

func (c *client) Ping(vsn string) error {
	_, err := c.consoleClient.PingCluster(c.ctx, console.ClusterPing{CurrentVersion: vsn})
	return err
}

func initLayouts(layouts *console.OperationalLayoutAttributes) *console.OperationalLayoutAttributes {
	if layouts == nil {
		return &console.OperationalLayoutAttributes{
			Namespaces: &console.ClusterNamespacesAttributes{},
		}
	}
	return layouts
}

func initServiceMesh(layouts *console.OperationalLayoutAttributes, serviceMesh *console.ServiceMesh) *console.OperationalLayoutAttributes {
	if serviceMesh == nil {
		return layouts
	}

	if layouts == nil {
		return &console.OperationalLayoutAttributes{
			ServiceMesh: serviceMesh,
		}
	}

	layouts.ServiceMesh = serviceMesh
	return layouts
}

func appendUniqueExternalDNSNamespace(slice []*string, newValue *string) []*string {
	if slice == nil {
		// Pre-allocate slice with initial capacity
		slice = make([]*string, 0, 4)
	}
	sliceSet := containers.ToSet[*string](slice)
	sliceSet.Add(newValue)
	return sliceSet.List()
}

func (c *client) RegisterRuntimeServices(svcs map[string]NamespaceVersion, deprecated []console.DeprecatedCustomResourceAttributes, serviceId *string, serviceMesh *console.ServiceMesh) error {
	// Pre-allocate slice with capacity based on the number of services
	inputs := make([]console.RuntimeServiceAttributes, 0, len(svcs))
	var layouts *console.OperationalLayoutAttributes
	for name, nv := range svcs {
		serviceName, ok := mapRuntimeService[name]
		if ok {
			name = serviceName
		}
		inputs = append(inputs, console.RuntimeServiceAttributes{
			Name:    name,
			Version: nv.Version,
		})
		switch name {
		case certManagerServiceName:
			layouts = initLayouts(layouts)
			layouts.Namespaces.CertManager = &nv.Namespace
		case ebsCsiDriverServiceName:
			layouts = initLayouts(layouts)
			layouts.Namespaces.EbsCsiDriver = &nv.Namespace
		case externalDNSServiceName:
			layouts = initLayouts(layouts)
			layouts.Namespaces.ExternalDNS = appendUniqueExternalDNSNamespace(layouts.Namespaces.ExternalDNS, &nv.Namespace)
		}
		if nv.PartOf != "" {
			switch nv.PartOf {
			case linkerdServiceName:
				layouts = initLayouts(layouts)
				layouts.Namespaces.Linkerd = &nv.Namespace
			case istioServiceName:
				layouts = initLayouts(layouts)
				layouts.Namespaces.Istio = &nv.Namespace
			case CiliumServiceName:
				layouts = initLayouts(layouts)
				layouts.Namespaces.Cilium = &nv.Namespace
			}
		}
	}
	inputsPointers := lo.ToSlicePtr(inputs)
	layouts = initServiceMesh(layouts, serviceMesh)
	response, err := c.consoleClient.RegisterRuntimeServices(c.ctx, inputsPointers, layouts, lo.ToSlicePtr(deprecated), serviceId)
	if response != nil {
		klog.V(log.LogLevelVerbose).InfoS("registered runtime services", "count", lo.FromPtr(response.RegisterRuntimeServices))
	}

	return err
}

func (c *client) MyCluster() (*console.MyCluster, error) {
	return c.consoleClient.MyCluster(c.ctx)
}

func (c *client) UpsertVirtualCluster(parentID string, attributes console.ClusterAttributes) (*console.GetClusterWithToken_Cluster, error) {
	cluster, err := c.consoleClient.UpsertVirtualCluster(c.ctx, parentID, attributes)
	if err != nil {
		return nil, err
	}

	if cluster == nil {
		return nil, nil
	}

	return &console.GetClusterWithToken_Cluster{
		DeployToken: cluster.UpsertVirtualCluster.DeployToken,
		ID:          cluster.UpsertVirtualCluster.ID,
		Name:        cluster.UpsertVirtualCluster.Name,
		Handle:      cluster.UpsertVirtualCluster.Handle,
		Self:        cluster.UpsertVirtualCluster.Self,
		Project:     cluster.UpsertVirtualCluster.Project,
	}, nil
}

func (c *client) IsClusterExists(id string) (bool, error) {
	cluster, err := c.GetCluster(id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return cluster != nil, nil
}

func (c *client) GetCluster(id string) (*console.TinyClusterFragment, error) {
	cluster, err := c.consoleClient.GetCluster(c.ctx, &id)
	if internalerrors.IgnoreNotFound(err) != nil {
		return nil, err
	}

	if internalerrors.IsNotFound(err) || cluster == nil || cluster.Cluster == nil {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	return &console.TinyClusterFragment{
		ID:      cluster.Cluster.ID,
		Name:    cluster.Cluster.Name,
		Handle:  cluster.Cluster.Handle,
		Self:    cluster.Cluster.Self,
		Project: cluster.Cluster.Project,
	}, nil
}

func (c *client) GetClusterByHandle(name string) (*console.TinyClusterFragment, error) {
	cluster, err := c.consoleClient.GetClusterByHandle(c.ctx, &name)
	if internalerrors.IgnoreNotFound(err) != nil {
		return nil, err
	}

	if internalerrors.IsNotFound(err) || cluster == nil || cluster.Cluster == nil {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	return &console.TinyClusterFragment{
		ID:      cluster.Cluster.ID,
		Name:    cluster.Cluster.Name,
		Handle:  cluster.Cluster.Handle,
		Self:    cluster.Cluster.Self,
		Project: cluster.Cluster.Project,
	}, nil
}

func (c *client) DetachCluster(id string) error {
	_, err := c.consoleClient.DetachCluster(c.ctx, id)
	return err
}

func (c *client) CreateCluster(attrs console.ClusterAttributes) (*console.CreateCluster, error) {
	return c.consoleClient.CreateCluster(c.ctx, attrs)
}

func (c *client) GetDeployToken(clusterId, clusterName *string) (string, error) {
	res, err := c.consoleClient.GetClusterWithToken(c.ctx, clusterId, clusterName)
	if err != nil {
		return "", err
	}

	if res == nil {
		return "", fmt.Errorf("cluster not found")
	}

	return lo.FromPtr(res.Cluster.DeployToken), nil
}

func (c *client) UpdateCluster(id string, attrs console.ClusterUpdateAttributes) error {
	_, err := c.consoleClient.UpdateCluster(c.ctx, id, attrs)
	return err
}
