/*
Copyright 2025.

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
	"strings"

	"github.com/Masterminds/semver/v3"
	fluxcd "github.com/fluxcd/helm-controller/api/v2"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/streamline"
	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
	rspb "helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/releaseutil"
	"helm.sh/helm/v3/pkg/storage/driver"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/yaml"
)

type HelmReleaseReconciler struct {
	client.Client
	Scheme    *runtime.Scheme
	ClientSet kubernetes.Interface
}

// Reconcile executes the drain logic once per HelmRelease object
func (r *HelmReleaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	hr := &fluxcd.HelmRelease{}
	if err := r.Get(ctx, req.NamespacedName, hr); err != nil {
		logger.Error(err, "unable to fetch HelmRelease")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if hr.Annotations == nil {
		return ctrl.Result{}, nil
	}
	serviceID, ok := hr.Annotations[smcommon.OwningInventoryKey]
	if !ok {
		logger.Info("HelmRelease does not belong to a service", "name", hr.Name)
		return ctrl.Result{}, nil
	}
	if hr.Spec.Chart == nil {
		logger.Info("HelmRelease does not have a chart", "name", hr.Name)
		return ctrl.Result{}, nil
	}

	interval := hr.Spec.Interval.Duration
	releaseNamespace := hr.GetStorageNamespace()

	release, err := r.listReleases(releaseNamespace, func(rel *rspb.Release) bool {
		if rel == nil {
			return false
		}

		return chartVersionMatches(hr, rel)
	})
	if err != nil {
		return ctrl.Result{}, err
	}
	// Flux has not installed the helm resources yet
	if len(release) == 0 {
		logger.Info("Release not found in the storage", "name", hr.Name)
		return jitterRequeue(requeueAfter, jitter), nil
	}

	keys := make([]smcommon.StoreKey, 0)
	resources := releaseutil.SplitManifests(release[0].Manifest)
	for _, resource := range resources {
		if resource == "" {
			continue
		}
		result := &releaseutil.SimpleHead{}
		if err := yaml.Unmarshal([]byte(resource), result); err != nil {
			return ctrl.Result{}, err
		}
		group, version := common.ParseAPIVersion(result.Version)
		key := smcommon.StoreKey{
			GVK: schema.GroupVersionKind{
				Group:   group,
				Version: version,
				Kind:    result.Kind,
			},
			Namespace: releaseNamespace,
			Name:      result.Metadata.Name,
		}
		keys = append(keys, key)
	}

	// set the helm resources as children of the service
	updated, err := streamline.GetGlobalStore().SetServiceChildren(serviceID, string(hr.GetUID()), keys)
	if err != nil {
		return ctrl.Result{}, err
	}
	// the helm resources are not in the cache/store yet
	if updated == 0 {
		return jitterRequeue(requeueAfter, jitter), nil
	}

	return jitterRequeue(interval, jitter), nil
}

func (r *HelmReleaseReconciler) listReleases(releaseNamespace string, filter func(*rspb.Release) bool) ([]*rspb.Release, error) {
	secrets := driver.NewSecrets(r.ClientSet.CoreV1().Secrets(releaseNamespace))
	release, err := secrets.List(filter)
	if err != nil {
		return nil, err
	}
	if len(release) > 0 {
		return release, nil
	}

	// Technically, that's not required since the new flux helm-controller ignores HELM_DRIVER settings,
	// but we can keep it just in case it changes or someone uses an older version.
	configmaps := driver.NewConfigMaps(r.ClientSet.CoreV1().ConfigMaps(releaseNamespace))
	release, err = configmaps.List(filter)
	if err != nil {
		return nil, err
	}
	if len(release) > 0 {
		return release, nil
	}

	return nil, nil
}

func chartVersionMatches(target *fluxcd.HelmRelease, rel *rspb.Release) bool {
	if target.Spec.Chart == nil {
		return rel.Name == target.Name
	}

	var desiredVersion string
	var actualVersion string

	if target.Spec.Chart != nil {
		desiredVersion = strings.TrimSpace(target.Spec.Chart.Spec.Version)
	}

	if rel.Chart != nil && rel.Chart.Metadata != nil {
		actualVersion = strings.TrimSpace(rel.Chart.Metadata.Version)
	}

	if len(desiredVersion) == 0 {
		return true
	}

	if len(desiredVersion) > 0 && len(actualVersion) == 0 {
		return false
	}

	constraint, err := semver.NewConstraint(desiredVersion)
	if err != nil {
		return false
	}

	version, err := semver.NewVersion(actualVersion)
	if err != nil {
		return false
	}
	return constraint.Check(version)
}

// SetupWithManager registers the controller
func (r *HelmReleaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&fluxcd.HelmRelease{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
