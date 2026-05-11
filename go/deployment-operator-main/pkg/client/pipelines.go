package client

import (
	stderrors "errors"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/samber/lo"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

const twentyFourHours = int32(86400)

func (c *client) UpdateGate(id string, attributes console.GateUpdateAttributes) error {
	_, err := c.consoleClient.UpdateGate(c.ctx, id, attributes)
	return err
}

func (c *client) GetClusterGates(after *string, first *int64) (*console.PagedClusterGateIDs, error) {
	resp, err := c.consoleClient.PagedClusterGateIDs(c.ctx, after, first, nil, nil)
	if err != nil {
		return nil, err
	}
	if resp.PagedClusterGates == nil {
		return nil, stderrors.New("the response from PagedClusterGates is nil")
	}
	return resp, nil
}

func (c *client) GetClusterGate(id string) (*console.PipelineGateFragment, error) {
	resp, err := c.consoleClient.GetClusterGate(c.ctx, id)
	if err != nil {
		return nil, fmt.Errorf("gate with id %s not found", id)
	}
	return resp.ClusterGate, nil
}

func (c *client) GateExists(id string) bool {
	pgf, err := c.GetClusterGate(id)
	if pgf != nil {
		return true
	}
	if errors.IsNotFound(err) {
		return false
	}
	return err == nil
}

func (c *client) ParsePipelineGateCR(pgFragment *console.PipelineGateFragment, operatorNamespace string) (*v1alpha1.PipelineGate, error) {
	name := utils.AsName(pgFragment.Name) + "-" + pgFragment.ID[:8]
	pipelineGate := &v1alpha1.PipelineGate{
		TypeMeta: metav1.TypeMeta{
			Kind:       "PipelineGate",
			APIVersion: v1alpha1.GroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: operatorNamespace,
		},
		Spec: v1alpha1.PipelineGateSpec{
			ID:       pgFragment.ID,
			Name:     pgFragment.Name,
			Type:     v1alpha1.GateType(pgFragment.Type),
			GateSpec: gateSpecFromGateSpecFragment(pgFragment.Name, pgFragment.Spec),
		},
	}
	return pipelineGate, nil
}

func JobSpecFromYaml(yamlString string) (*batchv1.JobSpec, error) {
	jobSpec := &batchv1.JobSpec{}
	err := yaml.Unmarshal([]byte(yamlString), jobSpec)
	return jobSpec, err
}

func gateSpecFromGateSpecFragment(gateName string, gsFragment *console.GateSpecFragment) *v1alpha1.GateSpec {
	if gsFragment == nil {
		return nil
	}
	return &v1alpha1.GateSpec{
		JobSpec: JobSpecFromJobSpecFragment(gateName, gsFragment.Job),
	}
}

func JobSpecFromJobSpecFragment(gateName string, jsFragment *console.JobSpecFragment) *batchv1.JobSpec {
	if jsFragment == nil {
		return nil
	}
	var jobSpec *batchv1.JobSpec
	var err error
	if jsFragment.Raw != nil && *jsFragment.Raw != "null" {
		jobSpec, err = JobSpecFromYaml(*jsFragment.Raw)
		if err != nil {
			return nil
		}
	} else {
		name := utils.AsName(gateName)
		jobSpec = &batchv1.JobSpec{
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Name:      name,
					Namespace: jsFragment.Namespace,
					// convert map[string]interface{} to map[string]string
					Labels:      StringMapFromInterfaceMap(jsFragment.Labels),
					Annotations: StringMapFromInterfaceMap(jsFragment.Annotations),
				},
				Spec: corev1.PodSpec{
					Containers:    ContainersFromContainerSpecFragments(name, jsFragment.Containers, jsFragment.Requests),
					RestartPolicy: corev1.RestartPolicyOnFailure,
				},
			},
		}
		if len(jsFragment.NodeSelector) > 0 {
			jobSpec.Template.Spec.NodeSelector = StringMapFromInterfaceMap(jsFragment.NodeSelector)
		}
		if len(jsFragment.Tolerations) > 0 {
			jobSpec.Template.Spec.Tolerations = TolerationsFromJobSpecFragments(jsFragment.Tolerations)
		}
		// Add the gatename annotation
		if jobSpec.Template.Annotations == nil {
			jobSpec.Template.Annotations = make(map[string]string)
		}
		gateNameAnnotationKey := v1alpha1.GroupVersion.Group + "/gatename"
		jobSpec.Template.Annotations[gateNameAnnotationKey] = gateName
	}
	jobSpec.TTLSecondsAfterFinished = lo.ToPtr(twentyFourHours)

	return jobSpec
}

func ContainersFromContainerSpecFragments(gateName string, containerSpecFragments []*console.ContainerSpecFragment, resources *console.ContainerResourcesFragment) []corev1.Container {
	containers := make([]corev1.Container, 0, len(containerSpecFragments))
	for i, csFragment := range containerSpecFragments {
		if csFragment == nil {
			continue
		}

		var name string
		if csFragment.Name != nil {
			name = *csFragment.Name
		} else {
			name = fmt.Sprintf("%s-%d", utils.AsName(gateName), i)
		}

		container := corev1.Container{
			Name:  name,
			Image: csFragment.Image,
			Args:  make([]string, 0),
		}

		for _, arg := range csFragment.Args {
			container.Args = append(container.Args, *arg)
		}

		for _, envVar := range csFragment.Env {
			container.Env = append(container.Env, corev1.EnvVar{
				Name:  envVar.Name,
				Value: envVar.Value,
			})
		}

		// translate the EnvFrom structs from the fragment into the according corev1.EnvFromSource of the k8s pod api
		for _, envFrom := range csFragment.EnvFrom {
			if envFrom.Secret == "" && envFrom.ConfigMap == "" {
				continue
			}
			envFromSource := corev1.EnvFromSource{}
			if envFrom.ConfigMap != "" {
				envFromSource.ConfigMapRef = &corev1.ConfigMapEnvSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: envFrom.ConfigMap,
					},
				}
			}

			if envFrom.Secret != "" {
				envFromSource.SecretRef = &corev1.SecretEnvSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: envFrom.Secret,
					},
				}
			}

			container.EnvFrom = append(container.EnvFrom, envFromSource)
		}
		container.Resources = ToResourceRequirements(resources)
		containers = append(containers, container)
	}

	return containers
}

func ToResourceRequirements(resources *console.ContainerResourcesFragment) corev1.ResourceRequirements {
	if resources == nil {
		return corev1.ResourceRequirements{}
	}

	return corev1.ResourceRequirements{
		Requests: ToResourceList(resources.Requests),
		Limits:   ToResourceList(resources.Limits),
	}
}

func ToResourceList(resources *console.ResourceRequestFragment) corev1.ResourceList {
	resourceList := corev1.ResourceList{}
	if resources == nil {
		return resourceList
	}

	if resources.CPU != nil {
		if cpu, err := resource.ParseQuantity(*resources.CPU); err == nil {
			resourceList[corev1.ResourceCPU] = cpu
		}
	}
	if resources.Memory != nil {
		if memory, err := resource.ParseQuantity(*resources.Memory); err == nil {
			resourceList[corev1.ResourceMemory] = memory
		}
	}
	return resourceList
}

// TolerationsFromJobSpecFragments maps GraphQL job spec tolerations to core tolerations.
func TolerationsFromJobSpecFragments(fragments []*console.JobSpecFragment_Tolerations) []corev1.Toleration {
	if len(fragments) == 0 {
		return nil
	}
	out := make([]corev1.Toleration, 0, len(fragments))
	for _, f := range fragments {
		if f == nil {
			continue
		}
		t := corev1.Toleration{}
		t.Key = lo.FromPtr(f.Key)
		t.Operator = corev1.TolerationOperator(lo.FromPtrOr(f.Operator, string(corev1.TolerationOpEqual)))
		t.Value = lo.FromPtr(f.Value)
		t.Effect = corev1.TaintEffect(lo.FromPtrOr(f.Effect, string(corev1.TaintEffectNoSchedule)))
		out = append(out, t)
	}
	return out
}

func StringMapFromInterfaceMap(labels map[string]interface{}) map[string]string {
	result := make(map[string]string)

	for key, value := range labels {
		if strValue, ok := value.(string); ok {
			result[key] = strValue
		} else {
			fmt.Printf("Skipping non-string value for key %s\n", key)
		}
	}
	return result
}

func IsPending(pgFragment *console.PipelineGateFragment) bool {
	return pgFragment != nil && pgFragment.State == console.GateStatePending
}

func IsClosed(pgFragment *console.PipelineGateFragment) bool {
	return pgFragment != nil && pgFragment.State == console.GateStateClosed
}
