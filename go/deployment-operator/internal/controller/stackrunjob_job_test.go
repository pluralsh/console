package controller

import (
	"fmt"
	"testing"

	"github.com/pluralsh/deployment-operator/pkg/common"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/test/mocks"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"k8s.io/client-go/kubernetes/scheme"
)

const defaultName = "default"

func TestGetDefaultContainerImage(t *testing.T) {
	fakeConsoleClient := mocks.NewClientMock(t)
	reconciler := StackRunJobReconciler{
		ConsoleClient: fakeConsoleClient,
		Scheme:        scheme.Scheme,
	}

	cases := []struct {
		name          string
		run           *console.StackRunMinimalFragment
		expectedImage string
	}{
		{
			name: "use_defaults_when_no_configuration_provided",
			run: &console.StackRunMinimalFragment{
				Type:          console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{},
			},
			expectedImage: "ghcr.io/pluralsh/harness:0.6.18-terraform-1.8",
		},
		{
			name: "custom_tool_version_provided",
			run: &console.StackRunMinimalFragment{
				Type: console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{
					Version: lo.ToPtr("1.8.4"),
				},
			},
			expectedImage: "ghcr.io/pluralsh/harness:0.6.18-terraform-1.8.4",
		},
		{
			name: "custom_tag_provided",
			run: &console.StackRunMinimalFragment{
				Type: console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{
					Tag: lo.ToPtr("0.4.99"),
				},
			},
			expectedImage: "ghcr.io/pluralsh/harness:0.4.99",
		},
		{
			name: "custom_image_and_tag_provided",
			run: &console.StackRunMinimalFragment{
				Type: console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{
					Image: lo.ToPtr("ghcr.io/pluralsh/custom"),
					Tag:   lo.ToPtr("0.4.99"),
				},
			},
			expectedImage: "ghcr.io/pluralsh/custom:0.4.99",
		},
		{
			name: "custom_image_provided",
			run: &console.StackRunMinimalFragment{
				Type: console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{
					Image: lo.ToPtr("ghcr.io/pluralsh/custom"),
				},
			},
			expectedImage: "ghcr.io/pluralsh/custom:0.6.18-terraform-1.8",
		},
		{
			name: "custom_image_and_version_provided",
			run: &console.StackRunMinimalFragment{
				Type: console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{
					Image:   lo.ToPtr("ghcr.io/pluralsh/custom"),
					Version: lo.ToPtr("1.8.4"),
				},
			},
			expectedImage: "ghcr.io/pluralsh/custom:1.8.4",
		},
		{
			name: "ignore_version_when_custom_tag_provided",
			run: &console.StackRunMinimalFragment{
				Type: console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{
					Tag:     lo.ToPtr("1.8.4"),
					Version: lo.ToPtr("1.8.0"),
				},
			},
			expectedImage: "ghcr.io/pluralsh/harness:1.8.4",
		},
	}

	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			img := reconciler.getDefaultContainerImage(test.run)
			assert.Equal(t, img, test.expectedImage)
		})
	}
}

func TestGenerateRunJob(t *testing.T) {
	namespace := defaultName
	runID := "1"
	reconciler := StackRunJobReconciler{}
	cases := []struct {
		name            string
		run             *console.StackRunMinimalFragment
		expectedJobSpec batchv1.JobSpec
	}{
		{
			name: "use_empty_job_spec",
			run: &console.StackRunMinimalFragment{
				ID:            runID,
				Type:          console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{},
			},
			expectedJobSpec: func() batchv1.JobSpec {
				js := genDefaultJobSpec(namespace, "use_empty_job_spec", runID)
				js.Template.Labels = nil
				return js
			}(),
		},
		{
			name: "use_defaults",
			run: &console.StackRunMinimalFragment{
				ID:            runID,
				Type:          console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{},
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
				},
			},
			expectedJobSpec: genDefaultJobSpec(namespace, "use_defaults", runID),
		},
		{
			name: "add_labels",
			run: &console.StackRunMinimalFragment{
				ID:            runID,
				Type:          console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{},
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
					Labels: map[string]interface{}{
						"test": "test",
					},
				},
			},
			expectedJobSpec: func() batchv1.JobSpec {
				js := genDefaultJobSpec(namespace, "add_labels", runID)
				js.Template.Labels = map[string]string{
					"test": "test",
				}
				return js
			}(),
		},
		{
			name: "add_sa",
			run: &console.StackRunMinimalFragment{
				ID:            runID,
				Type:          console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{},
				JobSpec: &console.JobSpecFragment{
					Namespace:      namespace,
					ServiceAccount: lo.ToPtr(defaultName),
				},
			},
			expectedJobSpec: func() batchv1.JobSpec {
				js := genDefaultJobSpec(namespace, "add_sa", runID)
				js.Template.Spec.ServiceAccountName = defaultName
				return js
			}(),
		},
		{
			name: "add_resources",
			run: &console.StackRunMinimalFragment{
				ID:            runID,
				Type:          console.StackTypeTerraform,
				Configuration: console.StackConfigurationFragment{},
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
					Requests: &console.ContainerResourcesFragment{
						Requests: &console.ResourceRequestFragment{
							CPU: lo.ToPtr("2Mi"),
						},
						Limits: &console.ResourceRequestFragment{
							Memory: lo.ToPtr("2M"),
						},
					},
				},
			},
			expectedJobSpec: func() batchv1.JobSpec {
				js := genDefaultJobSpec(namespace, "add_resources", runID)
				js.Template.Spec.Containers[0].Resources = corev1.ResourceRequirements{
					Requests: corev1.ResourceList{
						corev1.ResourceCPU: resource.MustParse("2Mi"),
					},
					Limits: corev1.ResourceList{
						corev1.ResourceMemory: resource.MustParse("2M"),
					},
				}
				return js
			}(),
		},
	}

	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			name := reconciler.GetRunResourceName(test.run)
			jobSpec := common.GetRunJobSpec(name, test.run.JobSpec)
			job, err := reconciler.GenerateRunJob(test.run, jobSpec, test.name, namespace)
			assert.Nil(t, err)
			assert.NotNil(t, job)
			assert.Equal(t, test.expectedJobSpec, job.Spec)
		})
	}
}

func genDefaultJobSpec(namespace, name, runID string) batchv1.JobSpec {
	r := StackRunJobReconciler{}
	run := &console.StackRunMinimalFragment{Type: console.StackTypeTerraform}
	return batchv1.JobSpec{
		Template: corev1.PodTemplateSpec{
			ObjectMeta: metav1.ObjectMeta{
				Name:        name,
				Namespace:   namespace,
				Labels:      map[string]string{},
				Annotations: map[string]string{podDefaultContainerAnnotation: "default"},
			},
			Spec: corev1.PodSpec{
				Containers: []corev1.Container{
					{
						Name:       defaultName,
						Image:      "ghcr.io/pluralsh/harness:0.6.18-terraform-1.8",
						WorkingDir: "",
						EnvFrom: []corev1.EnvFromSource{
							{
								SecretRef: &corev1.SecretEnvSource{
									LocalObjectReference: corev1.LocalObjectReference{
										Name: fmt.Sprintf("stack-%s", runID),
									},
								},
							},
						},
						Env:                      make([]corev1.EnvVar, 0),
						Resources:                corev1.ResourceRequirements{},
						VolumeMounts:             r.ensureDefaultVolumeMounts(nil),
						TerminationMessagePath:   "",
						TerminationMessagePolicy: "",
						ImagePullPolicy:          "",
						SecurityContext:          r.ensureDefaultContainerSecurityContext(nil, run),
						Stdin:                    false,
						StdinOnce:                false,
						TTY:                      false,
					},
				},
				RestartPolicy:   corev1.RestartPolicyNever,
				Volumes:         r.ensureDefaultVolumes(nil),
				SecurityContext: r.ensureDefaultPodSecurityContext(nil),
			},
		},
		TTLSecondsAfterFinished: lo.ToPtr(int32(5 * 60)),
		BackoffLimit:            lo.ToPtr(int32(0)),
	}
}
