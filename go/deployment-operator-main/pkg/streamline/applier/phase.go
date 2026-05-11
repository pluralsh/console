package applier

import (
	"slices"

	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/pluralsh/deployment-operator/pkg/streamline"
	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
)

type Phase struct {
	name       smcommon.SyncPhase
	skipped    []unstructured.Unstructured
	waves      []Wave
	deleteWave Wave
}

func (p *Phase) Name() smcommon.SyncPhase {
	return p.name
}

func (p *Phase) Skipped() []unstructured.Unstructured {
	return p.skipped
}

func (p *Phase) Waves() []Wave {
	if p.deleteWave.Len() != 0 {
		return append(p.waves, p.deleteWave)
	}

	return p.waves
}

func (p *Phase) HasWaves() bool {
	return len(p.Waves()) > 0
}

func (p *Phase) AddWave(wave Wave) {
	p.waves = append(p.waves, wave)
}

func (p *Phase) AppliedCount() int {
	return lo.Reduce(p.waves, func(agg int, item Wave, index int) int { return agg + item.Len() }, 0)
}

func (p *Phase) SkippedCount() int {
	return len(p.skipped)
}

func (p *Phase) DeletedCount() int {
	return p.deleteWave.Len()
}

func (p *Phase) ResourceCount() int {
	return p.AppliedCount() + p.SkippedCount() + p.DeletedCount()
}

func (p *Phase) HasResources() bool {
	return p.ResourceCount() > 0
}

func (p *Phase) ResourceHealth() (pending, failed bool, err error) {
	resources := p.skipped
	for _, wave := range p.waves {
		resources = append(resources, wave.items...)
	}

	return streamline.GetGlobalStore().GetResourceHealth(resources)
}

func NewPhase(name smcommon.SyncPhase, resources []unstructured.Unstructured, skipFilter FilterFunc, deleteFilter func(resources []unstructured.Unstructured) (toApply, toDelete []unstructured.Unstructured)) Phase {
	skipped := make([]unstructured.Unstructured, 0)
	toDeleteFromAllPhases, toApply := deleteFilter(resources)
	toDelete := algorithms.Filter(toDeleteFromAllPhases, func(u unstructured.Unstructured) bool {
		return smcommon.HasPhase(u, name)
	})

	wavesMap := make(map[int]Wave)
	for _, resource := range toApply {
		if skipFilter(resource) {
			skipped = append(skipped, resource)
			continue
		}

		i := smcommon.GetSyncWave(resource)
		if wave, ok := wavesMap[i]; !ok {
			wavesMap[i] = NewWave([]unstructured.Unstructured{resource}, ApplyWave)
		} else {
			wave.Add(resource)
			wavesMap[i] = wave
		}
	}

	waves := lo.Entries(wavesMap)
	slices.SortFunc(waves, func(a, b lo.Entry[int, Wave]) int {
		return a.Key - b.Key
	})

	return Phase{
		name:       name,
		skipped:    skipped,
		deleteWave: NewWave(toDelete, DeleteWave),
		waves:      algorithms.Map(waves, func(e lo.Entry[int, Wave]) Wave { return e.Value }),
	}
}

type Phases map[smcommon.SyncPhase]Phase

func (in Phases) Next(phase *smcommon.SyncPhase, failed bool) (*Phase, bool) {
	if phase == nil {
		return in.get(smcommon.SyncPhasePreSync), false
	}

	if failed && *phase != smcommon.SyncPhaseSync {
		return nil, false
	}

	if failed {
		return in.get(smcommon.SyncPhaseSyncFail), false
	}

	switch *phase {
	case smcommon.SyncPhasePreSync:
		return in.get(smcommon.SyncPhaseSync), true
	case smcommon.SyncPhaseSync:
		return in.get(smcommon.SyncPhasePostSync), false
	case smcommon.SyncPhasePostSync:
		return nil, false
	}

	return nil, false
}

func (in Phases) HasResourcesInFollowingPhases(phase *smcommon.SyncPhase) bool {
	if phase == nil {
		return false
	}

	switch *phase {
	case smcommon.SyncPhaseSync:
		return in.get(smcommon.SyncPhasePostSync).HasResources() || in.get(smcommon.SyncPhaseSyncFail).HasResources()
	case smcommon.SyncPhasePreSync:
		return in.get(smcommon.SyncPhaseSync).HasResources() || in.get(smcommon.SyncPhasePostSync).HasResources()
	default:
		return false
	}
}

func (in Phases) get(phase smcommon.SyncPhase) *Phase {
	p, ok := in[phase]
	if !ok {
		return nil
	}

	return &p
}

func NewPhases(resources []unstructured.Unstructured, skipFilter FilterFunc, deleteFilter func(resources []unstructured.Unstructured) (toApply, toDelete []unstructured.Unstructured)) Phases {
	phases := map[smcommon.SyncPhase][]unstructured.Unstructured{}
	for _, phase := range smcommon.SyncPhases {
		phases[phase] = lo.Filter(resources, func(resource unstructured.Unstructured, _ int) bool {
			return smcommon.HasPhase(resource, phase)
		})
	}

	return lo.MapValues(phases, func(u []unstructured.Unstructured, p smcommon.SyncPhase) Phase {
		return NewPhase(p, u, skipFilter, deleteFilter)
	})
}
