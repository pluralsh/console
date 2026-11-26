package controller

import (
	"context"
	"fmt"

	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/juicefs"
)

//+kubebuilder:rbac:groups=storage.k8s.io,resources=storageclasses,verbs=get;delete

// An external home names the runner's StorageClass in every revision, so the home volume is the same across
// revisions and Substrate lets an instance move between them. A new instance's home still has to start from its
// own revision's golden home, since the golden memory snapshot expects it: the gateway claims the golden actor's
// home as the revision's seed while the golden boot runs, and seeds each new instance's home from it before the
// instance's first resume. Substrate doesn't clone tags of templates with external volumes, so the tag can't.

// devboxGoldenHomeSeed is the seed a revision's golden home is captured into. Keyed on the template's UID, since
// a claim outlives a failed capture and a template recreated under the same name must be able to claim again; the
// "golden." prefix keeps it apart from the <atespace>.<template> seeds of older revisions and snapshot seeds.
func devboxGoldenHomeSeed(templateUID string) string {
	return "golden." + templateUID
}

// checkHomeStorageClass checks that an external home's StorageClass exists and is the driver's. Substrate reads
// the class when it creates each actor's volumes, so it must exist before the template's golden boot.
func (r *DevboxRunnerReconciler) checkHomeStorageClass(ctx context.Context, runner *v1alpha1.DevboxRunner) error {
	if runner.Spec.HomeStorage() != v1alpha1.DevboxHomeJuiceFS {
		return nil
	}
	sc := &storagev1.StorageClass{}
	if err := r.APIReader.Get(ctx, client.ObjectKey{Name: runner.Spec.HomeStorageClass()}, sc); err != nil {
		if apierrors.IsNotFound(err) {
			return fmt.Errorf("StorageClass %s for JuiceFS homes doesn't exist; enable juicefs in the agent-substrate chart", runner.Spec.HomeStorageClass())
		}
		return fmt.Errorf("reading StorageClass %s: %w", runner.Spec.HomeStorageClass(), err)
	}
	if sc.Provisioner != juicefs.DriverName {
		return fmt.Errorf("StorageClass %s is provisioned by %s, not %s", sc.Name, sc.Provisioner, juicefs.DriverName)
	}
	if sc.Parameters[juicefs.ParamSeed] != "" {
		return fmt.Errorf("StorageClass %s sets the %s parameter, which would seed every revision's homes from one golden boot", sc.Name, juicefs.ParamSeed)
	}
	return nil
}

// legacyHomeStorageClassName is the StorageClass revisions from before the runner-wide class had of their own.
func legacyHomeStorageClassName(atespace, template string) string {
	return "devbox-home." + atespace + "." + template
}

// deleteLegacyHomeStorageClass removes a collected older revision's own StorageClass.
// TODO: delete the revision's seed too; it stays in JuiceFS until then.
func (r *DevboxRunnerReconciler) deleteLegacyHomeStorageClass(ctx context.Context, atespace, template string) error {
	sc := &storagev1.StorageClass{ObjectMeta: metav1.ObjectMeta{Name: legacyHomeStorageClassName(atespace, template)}}
	if err := r.Delete(ctx, sc); client.IgnoreNotFound(err) != nil {
		return fmt.Errorf("deleting StorageClass %s: %w", sc.Name, err)
	}
	return nil
}
