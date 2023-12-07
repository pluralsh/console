//go:build !ignore_autogenerated
// +build !ignore_autogenerated

/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Code generated by controller-gen. DO NOT EDIT.

package v1alpha1

import (
	"k8s.io/api/core/v1"
	runtime "k8s.io/apimachinery/pkg/runtime"
)

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *Binding) DeepCopyInto(out *Binding) {
	*out = *in
	if in.Id != nil {
		in, out := &in.Id, &out.Id
		*out = new(string)
		**out = **in
	}
	if in.UserId != nil {
		in, out := &in.UserId, &out.UserId
		*out = new(string)
		**out = **in
	}
	if in.GroupId != nil {
		in, out := &in.GroupId, &out.GroupId
		*out = new(string)
		**out = **in
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new Binding.
func (in *Binding) DeepCopy() *Binding {
	if in == nil {
		return nil
	}
	out := new(Binding)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *Bindings) DeepCopyInto(out *Bindings) {
	*out = *in
	if in.Read != nil {
		in, out := &in.Read, &out.Read
		*out = make([]Binding, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
	if in.Write != nil {
		in, out := &in.Write, &out.Write
		*out = make([]Binding, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new Bindings.
func (in *Bindings) DeepCopy() *Bindings {
	if in == nil {
		return nil
	}
	out := new(Bindings)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *CloudProviderSettings) DeepCopyInto(out *CloudProviderSettings) {
	*out = *in
	if in.AWS != nil {
		in, out := &in.AWS, &out.AWS
		*out = new(v1.SecretReference)
		**out = **in
	}
	if in.Azure != nil {
		in, out := &in.Azure, &out.Azure
		*out = new(v1.SecretReference)
		**out = **in
	}
	if in.GCP != nil {
		in, out := &in.GCP, &out.GCP
		*out = new(v1.SecretReference)
		**out = **in
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new CloudProviderSettings.
func (in *CloudProviderSettings) DeepCopy() *CloudProviderSettings {
	if in == nil {
		return nil
	}
	out := new(CloudProviderSettings)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *Cluster) DeepCopyInto(out *Cluster) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	in.Spec.DeepCopyInto(&out.Spec)
	in.Status.DeepCopyInto(&out.Status)
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new Cluster.
func (in *Cluster) DeepCopy() *Cluster {
	if in == nil {
		return nil
	}
	out := new(Cluster)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *Cluster) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterAWSCloudSettings) DeepCopyInto(out *ClusterAWSCloudSettings) {
	*out = *in
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterAWSCloudSettings.
func (in *ClusterAWSCloudSettings) DeepCopy() *ClusterAWSCloudSettings {
	if in == nil {
		return nil
	}
	out := new(ClusterAWSCloudSettings)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterAzureCloudSettings) DeepCopyInto(out *ClusterAzureCloudSettings) {
	*out = *in
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterAzureCloudSettings.
func (in *ClusterAzureCloudSettings) DeepCopy() *ClusterAzureCloudSettings {
	if in == nil {
		return nil
	}
	out := new(ClusterAzureCloudSettings)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterBYOKCloudSettings) DeepCopyInto(out *ClusterBYOKCloudSettings) {
	*out = *in
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterBYOKCloudSettings.
func (in *ClusterBYOKCloudSettings) DeepCopy() *ClusterBYOKCloudSettings {
	if in == nil {
		return nil
	}
	out := new(ClusterBYOKCloudSettings)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterCloudSettings) DeepCopyInto(out *ClusterCloudSettings) {
	*out = *in
	if in.AWS != nil {
		in, out := &in.AWS, &out.AWS
		*out = new(ClusterAWSCloudSettings)
		**out = **in
	}
	if in.Azure != nil {
		in, out := &in.Azure, &out.Azure
		*out = new(ClusterAzureCloudSettings)
		**out = **in
	}
	if in.GCP != nil {
		in, out := &in.GCP, &out.GCP
		*out = new(ClusterGCPCloudSettings)
		**out = **in
	}
	if in.BYOK != nil {
		in, out := &in.BYOK, &out.BYOK
		*out = new(ClusterBYOKCloudSettings)
		**out = **in
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterCloudSettings.
func (in *ClusterCloudSettings) DeepCopy() *ClusterCloudSettings {
	if in == nil {
		return nil
	}
	out := new(ClusterCloudSettings)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterGCPCloudSettings) DeepCopyInto(out *ClusterGCPCloudSettings) {
	*out = *in
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterGCPCloudSettings.
func (in *ClusterGCPCloudSettings) DeepCopy() *ClusterGCPCloudSettings {
	if in == nil {
		return nil
	}
	out := new(ClusterGCPCloudSettings)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterList) DeepCopyInto(out *ClusterList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]Cluster, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterList.
func (in *ClusterList) DeepCopy() *ClusterList {
	if in == nil {
		return nil
	}
	out := new(ClusterList)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *ClusterList) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterNodePool) DeepCopyInto(out *ClusterNodePool) {
	*out = *in
	if in.Labels != nil {
		in, out := &in.Labels, &out.Labels
		*out = make(map[string]string, len(*in))
		for key, val := range *in {
			(*out)[key] = val
		}
	}
	if in.Taints != nil {
		in, out := &in.Taints, &out.Taints
		*out = make([]Taint, len(*in))
		copy(*out, *in)
	}
	if in.CloudSettings != nil {
		in, out := &in.CloudSettings, &out.CloudSettings
		*out = new(ClusterNodePoolCloudSettings)
		(*in).DeepCopyInto(*out)
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterNodePool.
func (in *ClusterNodePool) DeepCopy() *ClusterNodePool {
	if in == nil {
		return nil
	}
	out := new(ClusterNodePool)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterNodePoolAWSCloudSettings) DeepCopyInto(out *ClusterNodePoolAWSCloudSettings) {
	*out = *in
	if in.LaunchTemplateId != nil {
		in, out := &in.LaunchTemplateId, &out.LaunchTemplateId
		*out = new(string)
		**out = **in
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterNodePoolAWSCloudSettings.
func (in *ClusterNodePoolAWSCloudSettings) DeepCopy() *ClusterNodePoolAWSCloudSettings {
	if in == nil {
		return nil
	}
	out := new(ClusterNodePoolAWSCloudSettings)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterNodePoolCloudSettings) DeepCopyInto(out *ClusterNodePoolCloudSettings) {
	*out = *in
	if in.AWS != nil {
		in, out := &in.AWS, &out.AWS
		*out = new(ClusterNodePoolAWSCloudSettings)
		(*in).DeepCopyInto(*out)
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterNodePoolCloudSettings.
func (in *ClusterNodePoolCloudSettings) DeepCopy() *ClusterNodePoolCloudSettings {
	if in == nil {
		return nil
	}
	out := new(ClusterNodePoolCloudSettings)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterSpec) DeepCopyInto(out *ClusterSpec) {
	*out = *in
	if in.Handle != nil {
		in, out := &in.Handle, &out.Handle
		*out = new(string)
		**out = **in
	}
	if in.Version != nil {
		in, out := &in.Version, &out.Version
		*out = new(string)
		**out = **in
	}
	out.ProviderRef = in.ProviderRef
	if in.Protect != nil {
		in, out := &in.Protect, &out.Protect
		*out = new(bool)
		**out = **in
	}
	if in.Tags != nil {
		in, out := &in.Tags, &out.Tags
		*out = make(map[string]string, len(*in))
		for key, val := range *in {
			(*out)[key] = val
		}
	}
	if in.Bindings != nil {
		in, out := &in.Bindings, &out.Bindings
		*out = new(Bindings)
		(*in).DeepCopyInto(*out)
	}
	if in.CloudSettings != nil {
		in, out := &in.CloudSettings, &out.CloudSettings
		*out = new(ClusterCloudSettings)
		(*in).DeepCopyInto(*out)
	}
	if in.NodePools != nil {
		in, out := &in.NodePools, &out.NodePools
		*out = make([]ClusterNodePool, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterSpec.
func (in *ClusterSpec) DeepCopy() *ClusterSpec {
	if in == nil {
		return nil
	}
	out := new(ClusterSpec)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ClusterStatus) DeepCopyInto(out *ClusterStatus) {
	*out = *in
	if in.Id != nil {
		in, out := &in.Id, &out.Id
		*out = new(string)
		**out = **in
	}
	if in.CurrentVersion != nil {
		in, out := &in.CurrentVersion, &out.CurrentVersion
		*out = new(string)
		**out = **in
	}
	if in.Health != nil {
		in, out := &in.Health, &out.Health
		*out = new(string)
		**out = **in
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ClusterStatus.
func (in *ClusterStatus) DeepCopy() *ClusterStatus {
	if in == nil {
		return nil
	}
	out := new(ClusterStatus)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *GitRepository) DeepCopyInto(out *GitRepository) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	in.Spec.DeepCopyInto(&out.Spec)
	in.Status.DeepCopyInto(&out.Status)
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new GitRepository.
func (in *GitRepository) DeepCopy() *GitRepository {
	if in == nil {
		return nil
	}
	out := new(GitRepository)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *GitRepository) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *GitRepositoryList) DeepCopyInto(out *GitRepositoryList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]GitRepository, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new GitRepositoryList.
func (in *GitRepositoryList) DeepCopy() *GitRepositoryList {
	if in == nil {
		return nil
	}
	out := new(GitRepositoryList)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *GitRepositoryList) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *GitRepositorySpec) DeepCopyInto(out *GitRepositorySpec) {
	*out = *in
	if in.CredentialsRef != nil {
		in, out := &in.CredentialsRef, &out.CredentialsRef
		*out = new(v1.SecretReference)
		**out = **in
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new GitRepositorySpec.
func (in *GitRepositorySpec) DeepCopy() *GitRepositorySpec {
	if in == nil {
		return nil
	}
	out := new(GitRepositorySpec)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *GitRepositoryStatus) DeepCopyInto(out *GitRepositoryStatus) {
	*out = *in
	if in.Health != nil {
		in, out := &in.Health, &out.Health
		*out = new(string)
		**out = **in
	}
	if in.Message != nil {
		in, out := &in.Message, &out.Message
		*out = new(string)
		**out = **in
	}
	if in.Id != nil {
		in, out := &in.Id, &out.Id
		*out = new(string)
		**out = **in
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new GitRepositoryStatus.
func (in *GitRepositoryStatus) DeepCopy() *GitRepositoryStatus {
	if in == nil {
		return nil
	}
	out := new(GitRepositoryStatus)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *Provider) DeepCopyInto(out *Provider) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	in.Spec.DeepCopyInto(&out.Spec)
	out.Status = in.Status
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new Provider.
func (in *Provider) DeepCopy() *Provider {
	if in == nil {
		return nil
	}
	out := new(Provider)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *Provider) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ProviderList) DeepCopyInto(out *ProviderList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]Provider, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ProviderList.
func (in *ProviderList) DeepCopy() *ProviderList {
	if in == nil {
		return nil
	}
	out := new(ProviderList)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *ProviderList) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ProviderSpec) DeepCopyInto(out *ProviderSpec) {
	*out = *in
	if in.CloudSettings != nil {
		in, out := &in.CloudSettings, &out.CloudSettings
		*out = new(CloudProviderSettings)
		(*in).DeepCopyInto(*out)
	}
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ProviderSpec.
func (in *ProviderSpec) DeepCopy() *ProviderSpec {
	if in == nil {
		return nil
	}
	out := new(ProviderSpec)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *ProviderStatus) DeepCopyInto(out *ProviderStatus) {
	*out = *in
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new ProviderStatus.
func (in *ProviderStatus) DeepCopy() *ProviderStatus {
	if in == nil {
		return nil
	}
	out := new(ProviderStatus)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *Taint) DeepCopyInto(out *Taint) {
	*out = *in
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new Taint.
func (in *Taint) DeepCopy() *Taint {
	if in == nil {
		return nil
	}
	out := new(Taint)
	in.DeepCopyInto(out)
	return out
}
