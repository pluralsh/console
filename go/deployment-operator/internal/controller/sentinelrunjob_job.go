package controller

import (
	"context"
	"fmt"
	"os"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/samber/lo"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrs "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

func init() {
	imageTag := os.Getenv("IMAGE_TAG")
	if len(imageTag) > 0 {
		defaultImageTag = imageTag
	}
}

const (
	sentinelRunJobSelector              = "sentinelrun.deployments.plural.sh"
	defaultJobContainer                 = "default"
	sentinelRunJobDefaultContainerImage = "ghcr.io/pluralsh/sentinel-harness"
	defaultJobVolumeName                = "default"
	defaultJobVolumePath                = "/plural"
	defaultJobTmpVolumeName             = "default-tmp"
	defaultJobTmpVolumePath             = "/tmp"
)

var (
	defaultImageTag = "latest"

	defaultJobVolume = corev1.Volume{
		Name: defaultJobVolumeName,
		VolumeSource: corev1.VolumeSource{
			EmptyDir: &corev1.EmptyDirVolumeSource{},
		},
	}

	defaultJobContainerVolumeMount = corev1.VolumeMount{
		Name:      defaultJobVolumeName,
		MountPath: defaultJobVolumePath,
	}

	defaultJobTmpVolume = corev1.Volume{
		Name: defaultJobTmpVolumeName,
		VolumeSource: corev1.VolumeSource{
			EmptyDir: &corev1.EmptyDirVolumeSource{},
		},
	}

	defaultJobTmpContainerVolumeMount = corev1.VolumeMount{
		Name:      defaultJobTmpVolumeName,
		MountPath: defaultJobTmpVolumePath,
	}
)

func (r *SentinelRunJobReconciler) reconcileRunJob(ctx context.Context, srj *v1alpha1.SentinelRunJob, run *console.SentinelRunJobFragment) (*batchv1.Job, error) {
	foundJob := &batchv1.Job{}
	if err := r.Get(ctx, types.NamespacedName{Name: srj.Name, Namespace: srj.Namespace}, foundJob); err != nil {
		if !apierrs.IsNotFound(err) {
			return nil, err
		}

		jobSpec := common.GetRunJobSpec(srj.Name, run.JobSpec)
		job, err := r.GenerateRunJob(run, jobSpec, srj.Name, srj.Namespace)
		if err != nil {
			return nil, err
		}
		if err := r.Create(ctx, job); err != nil {
			return nil, err
		}
		return job, nil
	}

	return foundJob, nil
}

// GetRunResourceName returns a resource name used for a job and a secret connected to a given run.
func (r *SentinelRunJobReconciler) GetRunResourceName(run *console.SentinelRunJobFragment) string {
	return fmt.Sprintf("sentinel-%s", run.ID)
}

func (r *SentinelRunJobReconciler) GenerateRunJob(run *console.SentinelRunJobFragment, jobSpec *batchv1.JobSpec, name, namespace string) (*batchv1.Job, error) {
	var err error
	// If user-defined job spec was not available initialize it here.
	if jobSpec == nil {
		jobSpec = &batchv1.JobSpec{}
	}

	// Set requirements like name, namespace, container and volume.
	jobSpec.Template.Name = name
	jobSpec.Template.Namespace = namespace

	if jobSpec.Template.Annotations == nil {
		jobSpec.Template.Annotations = map[string]string{}
	}
	jobSpec.Template.Annotations[podDefaultContainerAnnotation] = defaultJobContainer

	jobSpec.Template.Spec.RestartPolicy = corev1.RestartPolicyNever

	jobSpec.BackoffLimit = lo.ToPtr(int32(0))
	jobSpec.TTLSecondsAfterFinished = lo.ToPtr(int32(5 * 60)) // 5 minutes after completion (success or failure) the job will be automatically cleaned up by Kubernetes

	jobSpec.Template.Spec.Containers = r.ensureDefaultContainer(jobSpec.Template.Spec.Containers, run)

	jobSpec.Template.Spec.Containers, err = r.ensureDefaultContainerResourcesRequests(jobSpec.Template.Spec.Containers, run)
	if err != nil {
		return nil, err
	}

	jobSpec.Template.Spec.Volumes = r.ensureDefaultVolumes(jobSpec.Template.Spec.Volumes)

	jobSpec.Template.Spec.SecurityContext = r.ensureDefaultPodSecurityContext(jobSpec.Template.Spec.SecurityContext)

	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:        name,
			Namespace:   namespace,
			Annotations: map[string]string{sentinelRunJobSelector: name},
			Labels:      map[string]string{sentinelRunJobSelector: name},
		},
		Spec: *jobSpec,
	}, nil
}

func (r *SentinelRunJobReconciler) ensureDefaultContainer(
	containers []corev1.Container,
	run *console.SentinelRunJobFragment,
) []corev1.Container {
	// Normalize user containers (image, mounts, env). A container named "default" in the spec is the
	// harness override (nothing appended). Otherwise append the standard default harness container.
	defaultContainer := r.getDefaultContainer(run)
	var byName map[string]*console.ContainerSpecFragment
	if run.JobSpec != nil {
		byName = lo.KeyBy(run.JobSpec.Containers, func(c *console.ContainerSpecFragment) string {
			return lo.FromPtr(c.Name)
		})
	}

	if len(containers) > 0 {
		// optionally normalize the default container (if they used the default name)
		index := algorithms.Index(containers, func(c corev1.Container) bool {
			return c.Name == defaultJobContainer
		})

		for i := range containers {
			if ct, ok := byName[containers[i].Name]; ok && ct.Image != "" {
				containers[i].Image = ct.Image
			}

			if containers[i].Image == "" {
				containers[i].Image = r.getDefaultContainerImage()
			}

			containers[i].VolumeMounts = r.ensureDefaultVolumeMounts(containers[i].VolumeMounts)
			containers[i].EnvFrom = append(containers[i].EnvFrom, r.getDefaultContainerEnvFrom(run)...)
		}

		if index == -1 {
			containers = append(containers, defaultContainer)
		}

		return containers
	}

	// If no containers at all, inject a default one (for safety)
	return []corev1.Container{defaultContainer}
}

func (r *SentinelRunJobReconciler) getDefaultContainer(run *console.SentinelRunJobFragment) corev1.Container {
	return corev1.Container{
		Name:  defaultJobContainer,
		Image: r.getDefaultContainerImage(),
		VolumeMounts: []corev1.VolumeMount{
			defaultJobContainerVolumeMount,
			defaultJobTmpContainerVolumeMount,
		},
		SecurityContext: r.ensureDefaultContainerSecurityContext(nil),
		Env:             make([]corev1.EnvVar, 0),
		EnvFrom:         r.getDefaultContainerEnvFrom(run),
	}
}

func (r *SentinelRunJobReconciler) getDefaultContainerEnvFrom(run *console.SentinelRunJobFragment) []corev1.EnvFromSource {
	return []corev1.EnvFromSource{
		{
			SecretRef: &corev1.SecretEnvSource{
				LocalObjectReference: corev1.LocalObjectReference{
					Name: r.GetRunResourceName(run),
				},
			},
		},
	}
}

func (r *SentinelRunJobReconciler) ensureDefaultVolumeMounts(mounts []corev1.VolumeMount) []corev1.VolumeMount {
	return append(
		algorithms.Filter(mounts, func(v corev1.VolumeMount) bool {
			switch v.Name {
			case defaultJobVolumeName, defaultJobTmpVolumeName:
				return false
			}

			return true
		}),
		defaultJobContainerVolumeMount,
		defaultJobTmpContainerVolumeMount,
	)
}

func (r *SentinelRunJobReconciler) ensureDefaultVolumes(volumes []corev1.Volume) []corev1.Volume {
	return append(volumes,
		defaultJobVolume,
		defaultJobTmpVolume,
	)
}

func (r *SentinelRunJobReconciler) ensureDefaultPodSecurityContext(psc *corev1.PodSecurityContext) *corev1.PodSecurityContext {
	if psc != nil {
		return psc
	}

	return &corev1.PodSecurityContext{
		RunAsNonRoot: lo.ToPtr(true),
		RunAsUser:    lo.ToPtr(nonRootUID),
		RunAsGroup:   lo.ToPtr(nonRootGID),
	}
}

func (r *SentinelRunJobReconciler) ensureDefaultContainerSecurityContext(sc *corev1.SecurityContext) *corev1.SecurityContext {
	if sc != nil {
		return sc
	}

	return &corev1.SecurityContext{
		AllowPrivilegeEscalation: lo.ToPtr(false),
		ReadOnlyRootFilesystem:   lo.ToPtr(false),
		RunAsNonRoot:             lo.ToPtr(true),
		RunAsUser:                lo.ToPtr(nonRootUID),
		RunAsGroup:               lo.ToPtr(nonRootGID),
	}
}

func (r *SentinelRunJobReconciler) ensureDefaultContainerResourcesRequests(containers []corev1.Container, run *console.SentinelRunJobFragment) ([]corev1.Container, error) {
	if run.JobSpec == nil || run.JobSpec.Requests == nil {
		return containers, nil
	}
	if run.JobSpec.Requests.Requests == nil && run.JobSpec.Requests.Limits == nil {
		return containers, nil
	}

	for i, container := range containers {
		if run.JobSpec.Requests.Requests != nil {
			if len(container.Resources.Requests) == 0 {
				containers[i].Resources.Requests = map[corev1.ResourceName]resource.Quantity{}
			}
			if run.JobSpec.Requests.Requests.CPU != nil {
				cpu, err := resource.ParseQuantity(*run.JobSpec.Requests.Requests.CPU)
				if err != nil {
					return nil, err
				}
				containers[i].Resources.Requests[corev1.ResourceCPU] = cpu
			}
			if run.JobSpec.Requests.Requests.Memory != nil {
				memory, err := resource.ParseQuantity(*run.JobSpec.Requests.Requests.Memory)
				if err != nil {
					return nil, err
				}
				containers[i].Resources.Requests[corev1.ResourceMemory] = memory
			}
		}
		if run.JobSpec.Requests.Limits != nil {
			if len(container.Resources.Limits) == 0 {
				containers[i].Resources.Limits = map[corev1.ResourceName]resource.Quantity{}
			}
			if run.JobSpec.Requests.Limits.CPU != nil {
				cpu, err := resource.ParseQuantity(*run.JobSpec.Requests.Limits.CPU)
				if err != nil {
					return nil, err
				}
				containers[i].Resources.Limits[corev1.ResourceCPU] = cpu
			}
			if run.JobSpec.Requests.Limits.Memory != nil {
				memory, err := resource.ParseQuantity(*run.JobSpec.Requests.Limits.Memory)
				if err != nil {
					return nil, err
				}
				containers[i].Resources.Limits[corev1.ResourceMemory] = memory
			}
		}
	}

	return containers, nil
}

func (r *SentinelRunJobReconciler) getDefaultContainerImage() string {
	// Use default image with default tag (can be overridden by IMAGE_TAG env var)
	return fmt.Sprintf("%s:%s", common.GetConfigurationManager().SwapBaseRegistry(sentinelRunJobDefaultContainerImage), defaultImageTag)
}
