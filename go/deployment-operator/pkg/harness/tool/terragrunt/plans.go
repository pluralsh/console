package terragrunt

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"

	tfjson "github.com/hashicorp/terraform-json"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	planFileBase = "tfplan.tfplan"
	planJSONBase = "tfplan.json"
)

type savedPlan struct {
	rel  string
	path string
}

type unitPlan struct {
	rel  string
	plan *tfjson.Plan
}

func planFiles(dir, name string) ([]savedPlan, error) {
	if dir == "" {
		return nil, fmt.Errorf("terragrunt plan directory is empty")
	}
	if _, err := os.Stat(dir); err != nil {
		return nil, fmt.Errorf("terragrunt plan directory %q: %w", dir, err)
	}

	plans := make([]savedPlan, 0)
	err := filepath.WalkDir(dir, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || d.Name() != name {
			return nil
		}

		rel, err := filepath.Rel(dir, filepath.Dir(p))
		if err != nil {
			return err
		}

		plans = append(plans, savedPlan{rel: filepath.ToSlash(rel), path: p})
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.Slice(plans, func(i, j int) bool {
		return plans[i].rel < plans[j].rel
	})
	return plans, nil
}

func loadUnitPlans(jsonOutDir string) ([]unitPlan, error) {
	files, err := planFiles(jsonOutDir, planJSONBase)
	if err != nil {
		return nil, err
	}

	units := make([]unitPlan, 0, len(files))
	for _, file := range files {
		raw, err := os.ReadFile(file.path)
		if err != nil {
			return nil, fmt.Errorf("read terragrunt plan %s: %w", file.rel, err)
		}

		plan := new(tfjson.Plan)
		if err := plan.UnmarshalJSON(raw); err != nil {
			return nil, fmt.Errorf("parse terragrunt plan %s: %w", file.rel, err)
		}

		units = append(units, unitPlan{rel: file.rel, plan: plan})
	}

	return units, nil
}

func changedUnitFilters(jsonOutDir string) ([]string, error) {
	units, err := loadUnitPlans(jsonOutDir)
	if err != nil {
		return nil, err
	}

	filters := make([]string, 0)
	for _, unit := range units {
		if !planHasChanges(unit.plan) {
			continue
		}
		filters = append(filters, "--filter", unitFilter(unit.rel))
	}

	return filters, nil
}

func unitFilter(rel string) string {
	if rel == "." {
		return "."
	}
	return "./" + rel
}

func planHasChanges(plan *tfjson.Plan) bool {
	if plan == nil {
		return false
	}

	if len(plan.DeferredChanges) > 0 {
		klog.V(log.LogLevelDebug).InfoS("plan has deferred changes", "count", len(plan.DeferredChanges))
		return true
	}

	for _, rc := range plan.ResourceChanges {
		if rc.Change != nil && !rc.Change.Actions.NoOp() {
			klog.V(log.LogLevelDebug).InfoS("plan has resource changes",
				"resource", rc.Address,
				"actions", rc.Change.Actions)
			return true
		}
	}

	for name, oc := range plan.OutputChanges {
		if oc != nil && !oc.Actions.NoOp() {
			klog.V(log.LogLevelDebug).InfoS("plan has output changes",
				"output", name,
				"actions", oc.Actions)
			return true
		}
	}

	if len(plan.ResourceDrift) > 0 {
		klog.V(log.LogLevelDebug).InfoS("plan detected resource drift", "count", len(plan.ResourceDrift))
		return true
	}

	return false
}
