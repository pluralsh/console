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
		NodePools:     nil,
		Tags:          tagsAttribute(cluster.Spec.Tags),
	}

	if cluster.Spec.Bindings != nil {
		attrs.ReadBindings = bindingsAttribute(cluster.Spec.Bindings.Read)
		attrs.WriteBindings = bindingsAttribute(cluster.Spec.Bindings.Write)
	}

	return attrs
}

func bindingsAttribute(input []v1alpha1.Binding) []*console.PolicyBindingAttributes {
	return algorithms.Map(input, func(v v1alpha1.Binding) *console.PolicyBindingAttributes {
		return &console.PolicyBindingAttributes{
			ID:      v.Id,
			UserID:  v.UserId,
			GroupID: v.GroupId,
		}
	})
}

func tagsAttribute(input map[string]string) []*console.TagAttributes {
	if len(input) == 0 {
		return nil
	}

	output := make([]*console.TagAttributes, len(input))
	for name, value := range input {
		output = append(output, &console.TagAttributes{
			Name:  name,
			Value: value,
		})
	}
	return output
}
