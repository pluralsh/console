package modagent

import (
	"context"
	"fmt"
	"testing"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"google.golang.org/protobuf/proto"
)

func TestStartsWorkersAccordingToConfiguration(t *testing.T) {
	for caseNum, config := range testConfigurations() {
		t.Run(fmt.Sprintf("case %d", caseNum), func(t *testing.T) {
			projects := config.GetGitops().GetManifestProjects()
			expectedNumberOfWorkers := len(projects)
			ws := make([]WorkSource[proto.Message], 0, len(projects))
			for _, project := range projects {
				ws = append(ws, &mockWorkSource{
					id:     *project.Id,
					config: project,
				})
			}

			wm, ctrl, factory := setupWM(t)
			worker := NewMockWorker(ctrl)
			factory.EXPECT().
				SourcesFromConfiguration(config).
				Return(ws)
			for i := 0; i < expectedNumberOfWorkers; i++ {
				factory.EXPECT().
					New(testhelpers.AgentId, ws[i]).
					Return(worker)
			}
			worker.EXPECT().
				Run(gomock.Any()).
				Times(expectedNumberOfWorkers)
			err := wm.ApplyConfiguration(testhelpers.AgentId, config)
			require.NoError(t, err)
		})
	}
}

func TestUpdatesWorkersAccordingToConfiguration(t *testing.T) {
	normalOrder := testConfigurations()
	reverseOrder := testConfigurations()
	reverse(reverseOrder)
	tests := []struct {
		name    string
		configs []*agentcfg.AgentConfiguration
	}{
		{
			name:    "normal order",
			configs: normalOrder,
		},
		{
			name:    "reverse order",
			configs: reverseOrder,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			numProjects := numUniqueProjects(tc.configs)
			wm, ctrl, factory := setupWM(t)
			worker := NewMockWorker(ctrl)
			worker.EXPECT().
				Run(gomock.Any()).
				Do(func(ctx context.Context) {
					<-ctx.Done()
				}).
				Times(numProjects)
			factory.EXPECT().
				New(testhelpers.AgentId, gomock.Any()).
				Return(worker).
				Times(numProjects)
			for _, config := range tc.configs {
				projects := config.GetGitops().GetManifestProjects()
				ws := make([]WorkSource[proto.Message], 0, len(projects))
				for _, project := range projects {
					ws = append(ws, &mockWorkSource{
						id:     *project.Id,
						config: project,
					})
				}
				factory.EXPECT().
					SourcesFromConfiguration(config).
					Return(ws)
				err := wm.ApplyConfiguration(testhelpers.AgentId, config)
				require.NoError(t, err)
			}
		})
	}
}

func TestErrorsOnDuplicateSourceId(t *testing.T) {
	wm, _, factory := setupWM(t)
	cfg := &agentcfg.AgentConfiguration{}
	factory.EXPECT().
		SourcesFromConfiguration(cfg).
		Return([]WorkSource[proto.Message]{
			&mockWorkSource{
				id: "id1",
			},
			&mockWorkSource{
				id: "id1",
			},
		})
	err := wm.ApplyConfiguration(testhelpers.AgentId, cfg)
	assert.EqualError(t, err, "duplicate source id: id1")
}

func setupWM(t *testing.T) (*WorkerManager[proto.Message], *gomock.Controller, *MockWorkerFactory[proto.Message]) {
	ctrl := gomock.NewController(t)
	workerFactory := NewMockWorkerFactory[proto.Message](ctrl)
	wm := NewWorkerManager[proto.Message](zaptest.NewLogger(t), workerFactory)
	t.Cleanup(wm.StopAllWorkers)
	return wm, ctrl, workerFactory
}

func numUniqueProjects(cfgs []*agentcfg.AgentConfiguration) int {
	num := 0
	projects := make(map[string]*agentcfg.ManifestProjectCF)
	for _, config := range cfgs {
		for _, proj := range config.GetGitops().GetManifestProjects() {
			old, ok := projects[*proj.Id]
			if ok {
				if !proto.Equal(old, proj) {
					projects[*proj.Id] = proj
					num++
				}
			} else {
				projects[*proj.Id] = proj
				num++
			}
		}
	}
	return num
}

func testConfigurations() []*agentcfg.AgentConfiguration {
	project1 := "bla1/project1"
	project2 := "bla1/project2"
	project3 := "bla3/project3"
	return []*agentcfg.AgentConfiguration{
		{
			AgentId: testhelpers.AgentId,
		},
		{
			Gitops: &agentcfg.GitopsCF{
				ManifestProjects: []*agentcfg.ManifestProjectCF{
					{
						Id: &project1,
					},
				},
			},
			AgentId: testhelpers.AgentId,
		},
		{
			Gitops: &agentcfg.GitopsCF{
				ManifestProjects: []*agentcfg.ManifestProjectCF{
					{
						Id:               &project1,
						DefaultNamespace: "abc", // update config
					},
					{
						Id: &project2,
					},
				},
			},
			AgentId: testhelpers.AgentId,
		},
		{
			Gitops: &agentcfg.GitopsCF{
				ManifestProjects: []*agentcfg.ManifestProjectCF{
					{
						Id: &project3,
					},
					{
						Id:               &project2,
						DefaultNamespace: "abc", // update config
					},
				},
			},
			AgentId: testhelpers.AgentId,
		},
	}
}

func reverse(cfgs []*agentcfg.AgentConfiguration) {
	for i, j := 0, len(cfgs)-1; i < j; i, j = i+1, j-1 {
		cfgs[i], cfgs[j] = cfgs[j], cfgs[i]
	}
}

var (
	_ WorkSource[proto.Message] = &mockWorkSource{}
)

type mockWorkSource struct {
	id     string
	config proto.Message
}

func (m *mockWorkSource) ID() string {
	return m.id
}

func (m *mockWorkSource) Configuration() proto.Message {
	return m.config
}
