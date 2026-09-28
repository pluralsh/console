package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	runtime "k8s.io/apimachinery/pkg/runtime"
)

func (in *TunnelControllerSpec) DeepCopyInto(out *TunnelControllerSpec) {
	*out = *in
}

func (in *TunnelControllerSpec) DeepCopy() *TunnelControllerSpec {
	if in == nil {
		return nil
	}
	out := new(TunnelControllerSpec)
	in.DeepCopyInto(out)
	return out
}

func (in *TunnelControllerStatus) DeepCopyInto(out *TunnelControllerStatus) {
	*out = *in
	if in.Conditions != nil {
		in, out := &in.Conditions, &out.Conditions
		*out = make([]metav1.Condition, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

func (in *TunnelControllerStatus) DeepCopy() *TunnelControllerStatus {
	if in == nil {
		return nil
	}
	out := new(TunnelControllerStatus)
	in.DeepCopyInto(out)
	return out
}

func (in *TunnelController) DeepCopyInto(out *TunnelController) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	in.Spec.DeepCopyInto(&out.Spec)
	in.Status.DeepCopyInto(&out.Status)
}

func (in *TunnelController) DeepCopy() *TunnelController {
	if in == nil {
		return nil
	}
	out := new(TunnelController)
	in.DeepCopyInto(out)
	return out
}

func (in *TunnelController) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

func (in *TunnelControllerList) DeepCopyInto(out *TunnelControllerList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]TunnelController, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

func (in *TunnelControllerList) DeepCopy() *TunnelControllerList {
	if in == nil {
		return nil
	}
	out := new(TunnelControllerList)
	in.DeepCopyInto(out)
	return out
}

func (in *TunnelControllerList) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}
