package controller

import (
	"context"
	"fmt"
	"os"
	"strings"

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

const (
	stackRunjobSelector           = "stackrun.deployments.plural.sh"
	stackRunDefaultJobContainer   = "default"
	stackRunDefaultContainerImage = "ghcr.io/pluralsh/harness"
)

var (
	stackRunDefaultContainerVersions = map[console.StackType]string{
		console.StackTypeTerraform: "1.8",
		console.StackTypeAnsible:   "latest",
	}

	stackRunDefaultJobVolume = corev1.Volume{
		Name: defaultJobVolumeName,
		VolumeSource: corev1.VolumeSource{
			EmptyDir: &corev1.EmptyDirVolumeSource{},
		},
	}

	stackRunDefaultJobContainerVolumeMount = corev1.VolumeMount{
		Name:      defaultJobVolumeName,
		MountPath: defaultJobVolumePath,
	}

	stackRunDefaultJobTmpVolume = corev1.Volume{
		Name: defaultJobTmpVolumeName,
		VolumeSource: corev1.VolumeSource{
			EmptyDir: &corev1.EmptyDirVolumeSource{},
		},
	}

	stackRunDefaultJobTmpContainerVolumeMount = corev1.VolumeMount{
		Name:      defaultJobTmpVolumeName,
		MountPath: defaultJobTmpVolumePath,
	}

	stackRunDefaultImageTag = "0.6.18"
)

func init() {
	if os.Getenv("IMAGE_TAG") != "" {
		stackRunDefaultImageTag = os.Getenv("IMAGE_TAG")
	}
}

func (r *StackRunJobReconciler) reconcileJob(ctx context.Context, run *v1alpha1.StackRunJob, stackRun *console.StackRunMinimalFragment) (*batchv1.Job, error) {
	foundJob := &batchv1.Job{}
	if err := r.Get(ctx, types.NamespacedName{Name: run.Name, Namespace: run.Namespace}, foundJob); err != nil {
		if !apierrs.IsNotFound(err) {
			return nil, err
		}

		jobSpec := common.GetRunJobSpec(run.Name, stackRun.JobSpec)
		job, err := r.GenerateRunJob(stackRun, jobSpec, run.Name, run.Namespace)
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

func (r *StackRunJobReconciler) GenerateRunJob(run *console.StackRunMinimalFragment, jobSpec *batchv1.JobSpec, name, namespace string) (*batchv1.Job, error) {
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
	jobSpec.Template.Annotations[podDefaultContainerAnnotation] = stackRunDefaultJobContainer

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
			Annotations: map[string]string{stackRunjobSelector: name},
			Labels:      map[string]string{stackRunjobSelector: name},
		},
		Spec: *jobSpec,
	}, nil
}

func (r *StackRunJobReconciler) ensureDefaultPodSecurityContext(psc *corev1.PodSecurityContext) *corev1.PodSecurityContext {
	if psc != nil {
		return psc
	}

	return &corev1.PodSecurityContext{
		RunAsNonRoot: lo.ToPtr(true),
		RunAsUser:    lo.ToPtr(nonRootUID),
		RunAsGroup:   lo.ToPtr(nonRootGID),
	}
}

func (r *StackRunJobReconciler) ensureDefaultVolumes(volumes []corev1.Volume) []corev1.Volume {
	return append(
		algorithms.Filter(volumes, func(v corev1.Volume) bool {
			switch v.Name {
			case defaultJobVolumeName:
			case defaultJobTmpVolumeName:
				return false
			}

			return true
		}),
		stackRunDefaultJobVolume,
		stackRunDefaultJobTmpVolume,
	)
}

func (r *StackRunJobReconciler) ensureDefaultContainerResourcesRequests(containers []corev1.Container, run *console.StackRunMinimalFragment) ([]corev1.Container, error) {
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

func (r *StackRunJobReconciler) ensureDefaultContainer(containers []corev1.Container, run *console.StackRunMinimalFragment) []corev1.Container {
	if index := algorithms.Index(containers, func(container corev1.Container) bool {
		return container.Name == stackRunDefaultJobContainer
	}); index == -1 {
		containers = append(containers, r.getDefaultContainer(run))
	} else {
		if containers[index].Image == "" {
			containers[index].Image = r.getDefaultContainerImage(run)
		}

		containers[index].EnvFrom = r.getDefaultContainerEnvFrom(run)

		containers[index].VolumeMounts = r.ensureDefaultVolumeMounts(containers[index].VolumeMounts)
		containers[index].SecurityContext = r.ensureDefaultContainerSecurityContext(containers[index].SecurityContext, run)
	}
	return containers
}

func (r *StackRunJobReconciler) ensureDefaultVolumeMounts(mounts []corev1.VolumeMount) []corev1.VolumeMount {
	return append(
		algorithms.Filter(mounts, func(v corev1.VolumeMount) bool {
			switch v.Name {
			case defaultJobVolumeName:
			case defaultJobTmpVolumeName:
				return false
			}

			return true
		}),
		stackRunDefaultJobContainerVolumeMount,
		stackRunDefaultJobTmpContainerVolumeMount,
	)
}

func (r *StackRunJobReconciler) getDefaultContainerEnvFrom(run *console.StackRunMinimalFragment) []corev1.EnvFromSource {
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

func (r *StackRunJobReconciler) getDefaultContainer(run *console.StackRunMinimalFragment) corev1.Container {
	return corev1.Container{
		Name:  stackRunDefaultJobContainer,
		Image: r.getDefaultContainerImage(run),
		VolumeMounts: []corev1.VolumeMount{
			defaultJobContainerVolumeMount,
			defaultJobTmpContainerVolumeMount,
		},
		SecurityContext: r.ensureDefaultContainerSecurityContext(nil, run),
		Env:             make([]corev1.EnvVar, 0),
		EnvFrom:         r.getDefaultContainerEnvFrom(run),
	}
}

func (r *StackRunJobReconciler) ensureDefaultContainerSecurityContext(sc *corev1.SecurityContext, run *console.StackRunMinimalFragment) *corev1.SecurityContext {
	if sc != nil {
		if run != nil && run.Type == console.StackTypeAnsible {
			sc.ReadOnlyRootFilesystem = lo.ToPtr(false)
		}
		return sc
	}

	readOnlyRootFilesystem := run == nil || run.Type != console.StackTypeAnsible

	return &corev1.SecurityContext{
		AllowPrivilegeEscalation: lo.ToPtr(false),
		ReadOnlyRootFilesystem:   lo.ToPtr(readOnlyRootFilesystem),
		RunAsNonRoot:             lo.ToPtr(true),
		RunAsUser:                lo.ToPtr(nonRootUID),
		RunAsGroup:               lo.ToPtr(nonRootGID),
	}
}

func (r *StackRunJobReconciler) getDefaultContainerImage(run *console.StackRunMinimalFragment) string {
	// Explicit docker tag (overrides the composite tag suffix below).
	// Format: <imageOrDefault>:<tag>
	if r.hasCustomTag(run) {
		return fmt.Sprintf("%s:%s", r.getImage(run), *run.Configuration.Tag)
	}

	// Pin tool semver as the full docker tag (optional escape hatch when both are set).
	// Format: <image>:<version>
	if r.hasCustomImage(run) && r.hasCustomVersion(run) {
		return fmt.Sprintf("%s:%s", *run.Configuration.Image, *run.Configuration.Version)
	}

	// Default tag shape: <patchTag>-<stackType>-<toolVersion>
	// Applies to the stock image, a custom `image` (repository override only), custom `version`, or any mix that
	// did not match the branches above.
	return fmt.Sprintf("%s:%s-%s-%s", r.getImage(run), r.getTag(run), strings.ToLower(string(run.Type)), r.getVersion(run))
}

func (r *StackRunJobReconciler) hasCustomImage(run *console.StackRunMinimalFragment) bool {
	return run.Configuration.Image != nil && len(*run.Configuration.Image) > 0
}

func (r *StackRunJobReconciler) getImage(run *console.StackRunMinimalFragment) string {
	if r.hasCustomImage(run) {
		return *run.Configuration.Image
	}

	return common.GetConfigurationManager().SwapBaseRegistry(stackRunDefaultContainerImage)
}

func (r *StackRunJobReconciler) hasCustomVersion(run *console.StackRunMinimalFragment) bool {
	return run.Configuration.Version != nil && len(*run.Configuration.Version) > 0
}

func (r *StackRunJobReconciler) getVersion(run *console.StackRunMinimalFragment) string {
	if r.hasCustomVersion(run) {
		return *run.Configuration.Version
	}

	return stackRunDefaultContainerVersions[run.Type]
}

func (r *StackRunJobReconciler) hasCustomTag(run *console.StackRunMinimalFragment) bool {
	return run.Configuration.Tag != nil && len(*run.Configuration.Tag) > 0
}

func (r *StackRunJobReconciler) getTag(run *console.StackRunMinimalFragment) string {
	if r.hasCustomTag(run) {
		return *run.Configuration.Tag
	}

	return stackRunDefaultImageTag
}
