package agentcfg

import (
	"testing"
	"time"

	"google.golang.org/protobuf/types/known/durationpb"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

func TestValidation_Valid(t *testing.T) {
	tests := []testhelpers.ValidTestcase{
		{
			Name:  "empty",
			Valid: &AgentConfiguration{},
		},
		{
			Name: "empty CiAccessGroupCF.DefaultNamespace",
			Valid: &CiAccessGroupCF{
				Id:               "abc",
				DefaultNamespace: "", // empty is ok
			},
		},
		{
			Name: "empty environments CiAccessGroupCF.Environments",
			Valid: &CiAccessGroupCF{
				Id:           "abc",
				Environments: []string{},
			},
		},
		{
			Name: "multiple environments CiAccessGroupCF.Environments",
			Valid: &CiAccessGroupCF{
				Id:           "abc",
				Environments: []string{"a", "b"},
			},
		},
		{
			Name: "empty environments CiAccessProjectCF.Environments",
			Valid: &CiAccessProjectCF{
				Id:           "abc",
				Environments: []string{},
			},
		},
		{
			Name: "multiple environments CiAccessProjectCF.Environments",
			Valid: &CiAccessProjectCF{
				Id:           "abc",
				Environments: []string{"a", "b"},
			},
		},
		{
			Name:  "empty CiAccessAsAgentCF",
			Valid: &CiAccessAsAgentCF{},
		},
		{
			Name:  "empty CiAccessAsCiJobCF",
			Valid: &CiAccessAsCiJobCF{},
		},
		{
			Name: "minimal CiAccessAsImpersonateCF",
			Valid: &CiAccessAsImpersonateCF{
				Username: "abc",
			},
		},
		{
			Name: "one group CiAccessAsImpersonateCF",
			Valid: &CiAccessAsImpersonateCF{
				Username: "abc",
				Groups:   []string{"g"},
			},
		},
		{
			Name:  "ManifestProjectCF with no Id",
			Valid: &ManifestProjectCF{},
		},
		{
			Name:  "minimal RemoteDevelopmentCF",
			Valid: &RemoteDevelopmentCF{},
		},
		{
			Name: "RemoteDevelopmentCF with valid intervals",
			Valid: &RemoteDevelopmentCF{
				PartialSyncInterval: durationpb.New(1 * time.Second),
				FullSyncInterval:    durationpb.New(1 * time.Second),
			},
		},
	}
	testhelpers.AssertValid(t, tests)
}

func TestValidation_Invalid(t *testing.T) {
	emptyId := ""
	tests := []testhelpers.InvalidTestcase{
		{
			ErrString: "invalid ManifestProjectCF.Id: value length must be at least 1 bytes",
			Invalid: &ManifestProjectCF{
				Id: &emptyId, // empty id is not ok
			},
		},
		{
			ErrString: "invalid PathCF.Glob: value length must be at least 1 bytes",
			Invalid: &PathCF{
				Glob: emptyId,
			},
		},
		{
			ErrString: "invalid CiAccessGroupCF.Id: value length must be at least 1 bytes",
			Invalid: &CiAccessGroupCF{
				Id: emptyId, // empty id is not ok
			},
		},
		{
			ErrString: "invalid CiAccessGroupCF.Environments[0]: value length must be at least 1 bytes",
			Invalid: &CiAccessGroupCF{
				Id:           "abc",
				Environments: []string{""},
			},
		},
		{
			ErrString: "invalid CiAccessProjectCF.Environments[0]: value length must be at least 1 bytes",
			Invalid: &CiAccessProjectCF{
				Id:           "abc",
				Environments: []string{""},
			},
		},
		{
			ErrString: "invalid CiAccessAsCF.As: value is required",
			Invalid:   &CiAccessAsCF{},
		},
		{
			ErrString: "invalid CiAccessAsCF.Agent: value is required",
			Invalid: &CiAccessAsCF{
				As: &CiAccessAsCF_Agent{},
			},
		},
		{
			ErrString: "invalid CiAccessAsCF.Impersonate: value is required",
			Invalid: &CiAccessAsCF{
				As: &CiAccessAsCF_Impersonate{},
			},
		},
		{
			ErrString: "invalid CiAccessAsCF.CiJob: value is required",
			Invalid: &CiAccessAsCF{
				As: &CiAccessAsCF_CiJob{},
			},
		},
		{
			ErrString: "invalid CiAccessAsImpersonateCF.Username: value length must be at least 1 bytes",
			Invalid:   &CiAccessAsImpersonateCF{},
		},
		{
			ErrString: "invalid CiAccessAsImpersonateCF.Groups[0]: value length must be at least 1 bytes",
			Invalid: &CiAccessAsImpersonateCF{
				Username: "a",
				Groups:   []string{""},
			},
		},
		{
			ErrString: "invalid ExtraKeyValCF.Key: value length must be at least 1 bytes; invalid ExtraKeyValCF.Val: value must contain at least 1 item(s)",
			Invalid:   &ExtraKeyValCF{},
		},
		{
			ErrString: "invalid RemoteDevelopmentCF.PartialSyncInterval: value must be greater than 0s; invalid RemoteDevelopmentCF.FullSyncInterval: value must be greater than 0s",
			Invalid: &RemoteDevelopmentCF{
				PartialSyncInterval: durationpb.New(0),
				FullSyncInterval:    durationpb.New(0),
			},
		},
	}
	testhelpers.AssertInvalid(t, tests)
}
