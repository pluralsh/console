package cluster_controller

import (
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	"github.com/pluralsh/polly/algorithms"
)

func clusterAttributes(cluster *v1alpha1.Cluster, providerId *string) console.ClusterAttributes {
	attrs := console.ClusterAttributes{
		Name:          cluster.Name,
		Handle:        cluster.Spec.Handle,
		ProviderID:    providerId,
		Version:       cluster.Spec.Version,
		Protect:       cluster.Spec.Protect,
		CloudSettings: nil,
		NodePools:     nodePoolsAttribute(cluster.Spec.NodePools),
		Tags:          tagsAttribute(cluster.Spec.Tags),
	}

	if cluster.Spec.Bindings != nil {
		attrs.ReadBindings = bindingsAttribute(cluster.Spec.Bindings.Read)
		attrs.WriteBindings = bindingsAttribute(cluster.Spec.Bindings.Write)
	}

	return attrs
}

func nodePoolsAttribute(nodePools []v1alpha1.ClusterNodePool) []*console.NodePoolAttributes {
	if nodePools == nil {
		return nil
	}

	return algorithms.Map(nodePools, func(nodePool v1alpha1.ClusterNodePool) *console.NodePoolAttributes {
		return &console.NodePoolAttributes{
			Name:          nodePool.Name,
			MinSize:       nodePool.MinSize,
			MaxSize:       nodePool.MaxSize,
			InstanceType:  nodePool.InstanceType,
			Labels:        nil,
			Taints:        nil,
			CloudSettings: nil,
		}
	})
}

func tagsAttribute(tags map[string]string) []*console.TagAttributes {
	if tags == nil {
		return nil
	}

	attr := make([]*console.TagAttributes, 0)
	for name, value := range tags {
		attr = append(attr, &console.TagAttributes{
			Name:  name,
			Value: value,
		})
	}
	return attr
}

func bindingsAttribute(bindings []v1alpha1.Binding) []*console.PolicyBindingAttributes {
	return algorithms.Map(bindings, func(binding v1alpha1.Binding) *console.PolicyBindingAttributes {
		return &console.PolicyBindingAttributes{
			ID:      binding.ID,
			UserID:  binding.UserID,
			GroupID: binding.GroupID,
		}
	})
}
