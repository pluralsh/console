package controller

import (
	"context"
	"fmt"
	"maps"
	"strconv"

	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/block"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/juicefs"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/zerofs"
)

//+kubebuilder:rbac:groups=storage.k8s.io,resources=storageclasses,verbs=get;create;delete

// A JuiceFS or ZeroFS home can't come from the golden tag, since Substrate doesn't clone tags of templates with
// external volumes, so each revision gets its own StorageClass whose seed parameter ties its volumes to the
// golden boot: the driver captures the golden actor's home as the seed and starts every later home from it.

// devboxHomeSeed is the seed of a revision's homes.
func devboxHomeSeed(atespace, template string) string {
	return atespace + "." + template
}

// devboxHomeStorageClassName is the per-revision StorageClass; both parts are DNS labels, so it's a valid name.
func devboxHomeStorageClassName(atespace, template string) string {
	return "devbox-home." + devboxHomeSeed(atespace, template)
}

// devboxHomeDriver is the CSI driver serving a kind of external home, and the agent-substrate chart value that
// installs it.
func devboxHomeDriver(storage v1alpha1.DevboxHomeStorage) (driver, seedParam, chartValue string) {
	switch storage {
	case v1alpha1.DevboxHomeZeroFS:
		return zerofs.DriverName, zerofs.ParamSeed, "zerofs"
	case v1alpha1.DevboxHomeBlock:
		return block.DriverName, block.ParamSeed, "block"
	}
	return juicefs.DriverName, juicefs.ParamSeed, "juicefs"
}

// ensureHomeStorageClass points an external home template's home at its revision's StorageClass, a copy of the
// runner's class with the revision's seed, creating it first. Substrate reads the class when it creates each
// actor's volumes, so it must exist before the template's golden boot.
func (r *DevboxRunnerReconciler) ensureHomeStorageClass(ctx context.Context, runner *v1alpha1.DevboxRunner, template *ateapi.ActorTemplate) error {
	storage := runner.Spec.HomeStorage()
	if !storage.External() {
		return nil
	}
	driver, seedParam, chartValue := devboxHomeDriver(storage)
	atespace, name := template.GetMetadata().GetAtespace(), template.GetMetadata().GetName()
	base := &storagev1.StorageClass{}
	if err := r.APIReader.Get(ctx, client.ObjectKey{Name: runner.Spec.HomeStorageClass()}, base); err != nil {
		if apierrors.IsNotFound(err) {
			return fmt.Errorf("StorageClass %s for %s homes doesn't exist; enable %s in the agent-substrate chart", runner.Spec.HomeStorageClass(), storage, chartValue)
		}
		return fmt.Errorf("reading StorageClass %s: %w", runner.Spec.HomeStorageClass(), err)
	}
	if base.Provisioner != driver {
		return fmt.Errorf("StorageClass %s is provisioned by %s, not %s", base.Name, base.Provisioner, driver)
	}
	if storage == v1alpha1.DevboxHomeBlock {
		if err := blockPreflight(base); err != nil {
			return err
		}
	}

	params := maps.Clone(base.Parameters)
	if params == nil {
		params = map[string]string{}
	}
	params[seedParam] = devboxHomeSeed(atespace, name)
	if storage == v1alpha1.DevboxHomeBlock {
		// Substrate never resizes a volume, so the driver grows a home's disk at attach to the largest size any
		// live revision of the runner asks for.
		size := runner.Spec.HomeSize()
		params[block.ParamGroup] = atespace
		params[block.ParamSize] = strconv.FormatInt(size.Value(), 10)
	}
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

// blockPreflight reads the block driver's check of its provider off its StorageClass.
func blockPreflight(sc *storagev1.StorageClass) error {
	provider, preflight := sc.Annotations[block.AnnotationProvider], sc.Annotations[block.AnnotationPreflight]
	switch preflight {
	case block.PreflightOK:
		return nil
	case "":
		return fmt.Errorf("the block driver hasn't checked its provider yet (no %s annotation on StorageClass %s); check the devbox-block-controller pods", block.AnnotationPreflight, sc.Name)
	}
	return fmt.Errorf("block storage provider %s can't serve homes: %s", provider, preflight)
}

// deleteHomeStorageClass removes a collected revision's StorageClass.
// TODO: delete the revision's seed too; it stays in JuiceFS or the ZeroFS bucket until then.
func (r *DevboxRunnerReconciler) deleteHomeStorageClass(ctx context.Context, atespace, template string) error {
	sc := &storagev1.StorageClass{ObjectMeta: metav1.ObjectMeta{Name: devboxHomeStorageClassName(atespace, template)}}
	if err := r.Delete(ctx, sc); client.IgnoreNotFound(err) != nil {
		return fmt.Errorf("deleting StorageClass %s: %w", sc.Name, err)
	}
	return nil
}
