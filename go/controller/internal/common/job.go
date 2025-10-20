package common

import (
	"encoding/json"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
)

func GateJobAttributes(job *v1alpha1.JobSpec) (*console.GateJobAttributes, error) {
	if job == nil {
		return nil, nil
	}

	var annotations, labels, nodeSelector, raw *string
	if job.Annotations != nil {
		result, err := json.Marshal(job.Annotations)
		if err != nil {
			return nil, err
		}
		annotations = lo.ToPtr(string(result))
	}
	if job.Labels != nil {
		result, err := json.Marshal(job.Labels)
		if err != nil {
			return nil, err
		}
		labels = lo.ToPtr(string(result))
	}

	if job.NodeSelector != nil {
		result, err := json.Marshal(job.NodeSelector)
		if err != nil {
			return nil, err
		}
		nodeSelector = lo.ToPtr(string(result))
	}

	if job.Raw != nil {
		rawData, err := json.Marshal(job.Raw)
		if err != nil {
			return nil, err
		}
		raw = lo.ToPtr(string(rawData))
	}

	var tolerations []*console.PodTolerationAttributes
	if job.Tolerations != nil {
		tolerations = algorithms.Map(job.Tolerations, func(t corev1.Toleration) *console.PodTolerationAttributes {
			return &console.PodTolerationAttributes{
				Key:      lo.ToPtr(t.Key),
				Operator: lo.ToPtr(string(t.Operator)),
				Value:    lo.ToPtr(t.Value),
				Effect:   lo.ToPtr(string(t.Effect)),
			}
		})
	}

	return &console.GateJobAttributes{
		Namespace: job.Namespace,
		Raw:       raw,
		Resources: containerResources(job.Resources),
		Containers: algorithms.Map(job.Containers,
			func(c *v1alpha1.Container) *console.ContainerAttributes {
				return &console.ContainerAttributes{
					Image: c.Image,
					Args:  c.Args,
					Env: algorithms.Map(c.Env, func(e *v1alpha1.Env) *console.EnvAttributes {
						return &console.EnvAttributes{Name: e.Name, Value: e.Value}
					}),
					Resources: containerResources(c.Resources),
					EnvFrom: algorithms.Map(c.EnvFrom, func(e *v1alpha1.EnvFrom) *console.EnvFromAttributes {
						return &console.EnvFromAttributes{Secret: e.Secret, ConfigMap: e.ConfigMap}
					}),
				}
			}),
		Labels:         labels,
		Annotations:    annotations,
		NodeSelector:   nodeSelector,
		Tolerations:    tolerations,
		ServiceAccount: job.ServiceAccount,
	}, nil
}

func containerResourceRequests(requests *v1alpha1.ContainerResourceRequests) *console.ResourceRequestAttributes {
	if requests == nil {
		return nil
	}

	return &console.ResourceRequestAttributes{
		CPU:    requests.CPU,
		Memory: requests.Memory,
	}
}

func containerResources(resources *v1alpha1.ContainerResources) *console.ContainerResourcesAttributes {
	if resources == nil {
		return nil
	}

	return &console.ContainerResourcesAttributes{
		Requests: containerResourceRequests(resources.Requests),
		Limits:   containerResourceRequests(resources.Limits),
	}
}
