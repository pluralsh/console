package store

import (
	"github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

// ComponentState int32 representation used for better performance.
type ComponentState int32

const (
	ComponentStateRunning ComponentState = iota
	ComponentStatePending
	ComponentStateFailed
	ComponentStatePaused
)

// Attribute that can be used in the Console API calls.
func (in ComponentState) Attribute() *client.ComponentState {
	switch in {
	case ComponentStateRunning:
		return lo.ToPtr(client.ComponentStateRunning)
	case ComponentStatePending:
		return lo.ToPtr(client.ComponentStatePending)
	case ComponentStateFailed:
		return lo.ToPtr(client.ComponentStateFailed)
	case ComponentStatePaused:
		return lo.ToPtr(client.ComponentStatePaused)
	default:
		return nil
	}
}

// String returns human-readable component state string representation.
func (in ComponentState) String() string {
	return string(lo.FromPtr(in.Attribute()))
}

func NewComponentState(in *client.ComponentState) ComponentState {
	if in == nil {
		return ComponentStatePending
	}

	switch *in {
	case client.ComponentStateRunning:
		return ComponentStateRunning
	case client.ComponentStatePending:
		return ComponentStatePending
	case client.ComponentStateFailed:
		return ComponentStateFailed
	case client.ComponentStatePaused:
		return ComponentStatePaused
	default:
		return ComponentStatePending
	}
}
