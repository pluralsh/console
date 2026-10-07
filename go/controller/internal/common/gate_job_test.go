package common_test

import (
	"encoding/json"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/common"
)

func TestGateJobAttributesContainers(t *testing.T) {
	attributes, err := common.GateJobAttributes(&v1alpha1.JobSpec{Namespace: "default"})
	if err != nil {
		t.Fatalf("GateJobAttributes returned an error: %v", err)
	}

	if attributes.Containers == nil {
		t.Fatal("GateJobAttributes returned a nil Containers pointer")
	}
	if got := len(*attributes.Containers); got != 0 {
		t.Fatalf("GateJobAttributes returned %d containers, want 0", got)
	}

	encoded, err := json.Marshal(attributes)
	if err != nil {
		t.Fatalf("json.Marshal returned an error: %v", err)
	}
	if got, want := string(encoded), `{"namespace":"default","containers":[]}`; got != want {
		t.Fatalf("json.Marshal = %s, want %s", got, want)
	}

	encoded, err = json.Marshal(&console.GateJobAttributes{Namespace: "default"})
	if err != nil {
		t.Fatalf("json.Marshal returned an error for an unset containers field: %v", err)
	}
	if got, want := string(encoded), `{"namespace":"default"}`; got != want {
		t.Fatalf("json.Marshal with an unset containers field = %s, want %s", got, want)
	}
}
