package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const ImageWarmerNameLabel = "deployments.plural.sh/image-warmer-name"

// ImageWarmerSpec defines an image that should periodically be pulled onto
// every selected node.
type ImageWarmerSpec struct {
	// Cron is a standard five-field cron expression controlling how often the
	// image is refreshed.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Cron string `json:"cron"`

	// Image is the OCI image to warm.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Image string `json:"image"`

	// Template optionally overrides the secure default warmer pod template.
	// +kubebuilder:validation:Optional
	Template *corev1.PodTemplateSpec `json:"template,omitempty"`

	// Selector restricts warming to nodes matching this label selector.
	// +kubebuilder:validation:Optional
	Selector *metav1.LabelSelector `json:"selector,omitempty"`
}

// ImageWarmerStatus defines the observed state of ImageWarmer.
type ImageWarmerStatus struct {
	// LastScheduleTime is the last time a warming DaemonSet was started.
	// +kubebuilder:validation:Optional
	LastScheduleTime *metav1.Time `json:"lastScheduleTime,omitempty"`

	// LastSuccessfulTime is the last time all selected nodes reported the
	// warming pod ready.
	// +kubebuilder:validation:Optional
	LastSuccessfulTime *metav1.Time `json:"lastSuccessfulTime,omitempty"`

	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

func (in *ImageWarmer) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Image",type="string",JSONPath=".spec.image"
//+kubebuilder:printcolumn:name="Last Successful",type="date",JSONPath=".status.lastSuccessfulTime"

// ImageWarmer is the Schema for the imagewarmers API.
type ImageWarmer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ImageWarmerSpec   `json:"spec,omitempty"`
	Status ImageWarmerStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ImageWarmerList contains a list of ImageWarmer.
type ImageWarmerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ImageWarmer `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ImageWarmer{}, &ImageWarmerList{})
}
