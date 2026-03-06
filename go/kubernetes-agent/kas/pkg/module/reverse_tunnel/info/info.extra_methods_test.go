package info

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSupportsServiceAndMethod(t *testing.T) {
	ti := &AgentDescriptor{
		Services: []*Service{
			{
				Name: "empire.fleet.DeathStar",
				Methods: []*Method{
					{
						Name: "BlastPlanet",
					},
				},
			},
		},
	}
	assert.True(t, ti.SupportsServiceAndMethod("empire.fleet.DeathStar", "BlastPlanet"))
	assert.False(t, ti.SupportsServiceAndMethod("empire.fleet.DeathStar", "Explode"))
	assert.False(t, ti.SupportsServiceAndMethod("empire.fleet.hangar.DeathStar", "BlastPlanet"))
	assert.False(t, ti.SupportsServiceAndMethod("empire.fleet.hangar.DeathStar", "Debug"))
}
