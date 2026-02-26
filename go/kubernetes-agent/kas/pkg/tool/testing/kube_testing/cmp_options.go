package kube_testing

import (
	"reflect"

	"github.com/google/go-cmp/cmp"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

var (
	runtimeObjectType = reflect.TypeOf((*runtime.Object)(nil)).Elem()
	unstructuredType  = reflect.TypeOf((*unstructured.Unstructured)(nil)).Elem()
)

// TransformToUnstructured transforms runtime.Object instances into unstructured.Unstructured to facilitate comparisons.
// This makes it possible to compare a typed object with its unstructured representation.
func TransformToUnstructured() cmp.Option {
	return cmp.FilterPath(filterAnd(isRuntimeObjectPath, atLeastOneIsNotUnstructuredPath), cmp.Transformer("kube_testing.TransformToUnstructured", func(obj interface{}) unstructured.Unstructured {
		unObj, err := unstructuredConverter.ToUnstructured(toRuntimeObject(obj))
		if err != nil {
			panic(err)
		}
		return unstructured.Unstructured{
			Object: unObj,
		}
	}))
}

func toRuntimeObjectReflect(rv reflect.Value) runtime.Object {
	var obj interface{}
	// Make obj a pointer if it's not already. Does a shallow copy.
	if rv.Kind() != reflect.Ptr && !isRuntimeObjectType(rv.Type()) {
		pv := reflect.New(rv.Type())
		pv.Elem().Set(rv)
		obj = pv.Interface()
	} else {
		obj = rv.Interface()
	}
	return obj.(runtime.Object)
}

func toRuntimeObject(obj interface{}) runtime.Object {
	return toRuntimeObjectReflect(reflect.ValueOf(obj))
}

// addrType returns a pointer to t if t isn't a pointer or interface.
func addrType(t reflect.Type) reflect.Type {
	if k := t.Kind(); k == reflect.Interface || k == reflect.Ptr {
		return t
	}
	return reflect.PointerTo(t)
}

func isRuntimeObjectType(t reflect.Type) bool {
	return t.Implements(runtimeObjectType)
}

func isUnstructuredType(t reflect.Type) bool {
	return t == unstructuredType
}

func atLeastOneIsNotUnstructuredPath(path cmp.Path) bool {
	ps := path.Last()
	pst := ps.Type()
	if isUnstructuredType(pst) {
		// Both are unstructured.Unstructured, no need to transform
		return false
	}
	if pst.Kind() == reflect.Interface {
		vx, vy := ps.Values()
		if !vx.IsValid() || vx.IsNil() || !vy.IsValid() || vy.IsNil() {
			return false
		}
		return !isUnstructuredType(vx.Elem().Type()) || !isUnstructuredType(vy.Elem().Type())
	}
	return true
}

func isRuntimeObjectPath(path cmp.Path) bool {
	ps := path.Last()
	pst := ps.Type()
	if isRuntimeObjectType(addrType(pst)) {
		// A runtime.Object
		return true
	}
	if pst.Kind() == reflect.Interface {
		vx, vy := ps.Values()
		if !vx.IsValid() || vx.IsNil() || !vy.IsValid() || vy.IsNil() {
			return false
		}
		x := isRuntimeObjectType(addrType(vx.Elem().Type())) && isRuntimeObjectType(addrType(vy.Elem().Type()))
		return x
	}
	return false
}

func filterAnd(funcs ...func(cmp.Path) bool) func(cmp.Path) bool {
	return func(path cmp.Path) bool {
		for _, f := range funcs {
			if !f(path) {
				return false
			}
		}
		return true
	}
}
