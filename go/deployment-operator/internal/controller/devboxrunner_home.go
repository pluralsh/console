package controller

import (
	"context"
	"fmt"
	"maps"

	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/juicefs"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

//+kubebuilder:rbac:groups=storage.k8s.io,resources=storageclasses,verbs=get;create;delete

// A JuiceFS home can't come from the golden tag, since Substrate doesn't clone tags of templates with external
// volumes, so each revision gets its own StorageClass whose seed parameter ties its volumes to the golden boot:
// the driver captures the golden actor's home as the seed and clones every later home from it.

// devboxHomeSeed is the seed of a revision's JuiceFS homes.
func devboxHomeSeed(atespace, template string) string {
	return atespace + "." + template
}

// devboxHomeStorageClassName is the per-revision StorageClass; both parts are DNS labels, so it's a valid name.
func devboxHomeStorageClassName(atespace, template string) string {
	return "devbox-home." + devboxHomeSeed(atespace, template)
}

// ensureHomeStorageClass points a JuiceFS template's home at its revision's StorageClass, a copy of the
// runner's class with the revision's seed, creating it first. Substrate reads the class when it creates each
// actor's volumes, so it must exist before the template's golden boot.
func (r *DevboxRunnerReconciler) ensureHomeStorageClass(ctx context.Context, runner *v1alpha1.DevboxRunner, template *ateapi.ActorTemplate) error {
	if runner.Spec.HomeStorage() != v1alpha1.DevboxHomeJuiceFS {
		return nil
	}
	atespace, name := template.GetMetadata().GetAtespace(), template.GetMetadata().GetName()
	base := &storagev1.StorageClass{}
	if err := r.APIReader.Get(ctx, client.ObjectKey{Name: runner.Spec.HomeStorageClass()}, base); err != nil {
		if apierrors.IsNotFound(err) {
			return fmt.Errorf("StorageClass %s for JuiceFS homes doesn't exist; enable juicefs in the agent-substrate chart", runner.Spec.HomeStorageClass())
		}
		return fmt.Errorf("reading StorageClass %s: %w", runner.Spec.HomeStorageClass(), err)
	}
	if base.Provisioner != juicefs.DriverName {
		return fmt.Errorf("StorageClass %s is provisioned by %s, not %s", base.Name, base.Provisioner, juicefs.DriverName)
	}

	params := maps.Clone(base.Parameters)
	if params == nil {
		params = map[string]string{}
	}
	params[juicefs.ParamSeed] = devboxHomeSeed(atespace, name)
	sc := &storagev1.StorageClass{
		ObjectMeta:    metav1.ObjectMeta{Name: devboxHomeStorageClassName(atespace, name), Labels: map[string]string{v1alpha1.DevboxRunnerNameLabel: runner.Name}},
		Provisioner:   base.Provisioner,
		Parameters:    params,
		ReclaimPolicy: base.ReclaimPolicy,
	}
	if err := controllerutil.SetOwnerReference(runner, sc, r.Scheme); err != nil {
		return err
	}
	if err := r.Create(ctx, sc); err != nil && !apierrors.IsAlreadyExists(err) {
		return fmt.Errorf("creating StorageClass %s: %w", sc.Name, err)
	}

	for _, vol := range template.Volumes {
		if vol.Name == devboxHomeVolume && vol.GetExternal().GetTemplate() != nil {
			vol.External.Template.StorageClassName = sc.Name
		}
	}
	return nil
}

// deleteHomeStorageClass removes a collected revision's StorageClass.
// TODO: delete the revision's seed too; it stays in JuiceFS until then.
func (r *DevboxRunnerReconciler) deleteHomeStorageClass(ctx context.Context, atespace, template string) error {
	sc := &storagev1.StorageClass{ObjectMeta: metav1.ObjectMeta{Name: devboxHomeStorageClassName(atespace, template)}}
	if err := r.Delete(ctx, sc); client.IgnoreNotFound(err) != nil {
		return fmt.Errorf("deleting StorageClass %s: %w", sc.Name, err)
	}
	return nil
}
