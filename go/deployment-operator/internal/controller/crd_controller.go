/*
Copyright 2024.

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

package controller

import (
	"context"

	"github.com/pluralsh/console/go/polly/containers"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
)

type SetupWithManager func(mgr ctrl.Manager) error

// CrdRegisterControllerReconciler reconciles a custom resource.
type CrdRegisterControllerReconciler struct {
	k8sClient.Client
	Scheme                *runtime.Scheme
	ReconcilerGroups      map[schema.GroupVersionKind]SetupWithManager
	Mgr                   ctrl.Manager
	DiscoveryCache        discoverycache.Cache
	registeredControllers containers.Set[schema.GroupVersionKind]
}

// Reconcile Custom resources to ensure that Console stays in sync with Kubernetes cluster.
func (r *CrdRegisterControllerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	if r.registeredControllers == nil {
		r.registeredControllers = containers.NewSet[schema.GroupVersionKind]()
	}

	crd := new(apiextensionsv1.CustomResourceDefinition)
	if err := r.Get(ctx, req.NamespacedName, crd); err != nil {
		logger.Error(err, "Unable to fetch CRD")
		return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
	}
	if !crd.DeletionTimestamp.IsZero() {
		r.maybeDeregisterResource(crd)
		return ctrl.Result{}, nil
	}
	group := crd.Spec.Group

	for _, v := range crd.Spec.Versions {
		version := v.Name
		gvk := schema.GroupVersionKind{
			Group:   group,
			Kind:    crd.Spec.Names.Kind,
			Version: version,
		}

		if v.Served {
			r.DiscoveryCache.MaybeResetRESTMapper(gvk)
			r.DiscoveryCache.Add(gvk)
		}

		reconcile, ok := r.ReconcilerGroups[gvk]
		if !ok {
			continue
		}

		if !r.registeredControllers.Has(gvk) {
			logger.Info("Register controller for", "group", group)
			if err := reconcile(r.Mgr); err != nil {
				logger.Error(err, "Unable to register controller for", "group", group)
				return ctrl.Result{}, err
			}
			r.registeredControllers.Add(gvk)
		}
	}

	return ctrl.Result{}, nil
}

func (r *CrdRegisterControllerReconciler) maybeDeregisterResource(crd *apiextensionsv1.CustomResourceDefinition) {
	for _, v := range crd.Spec.Versions {
		version := v.Name
		gvk := schema.GroupVersionKind{
			Group:   crd.Spec.Group,
			Kind:    crd.Spec.Names.Kind,
			Version: version,
		}
		r.DiscoveryCache.Delete(gvk)
	}
}

// SetupWithManager sets up the controller with the Manager.
func (r *CrdRegisterControllerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&apiextensionsv1.CustomResourceDefinition{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
