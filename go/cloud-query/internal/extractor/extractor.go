package extractor

import (
	"encoding/json"
	"fmt"

	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// Extractor is an interface that defines the methods required for extracting resources
// from a cloud provider.
type Extractor interface {
	Extract(connection.Connection) error
	Sink() Sink
	Resources() map[string]ResourceFactory
}

// Sink is an interface that defines the method for sending extracted output.
type Sink interface {
	Send(output *cloudquery.ExtractOutput) error
}

// Resource is an interface that defines the methods required to extract information
// used by the extractor.
type Resource interface {
	ID() string
	Links() []string
}

type ResourceFactory func(json string) (Resource, error)

// NewResource is a generic function that creates a new cloud resource from a JSON string.
func NewResource[T Resource](rowJson string) (Resource, error) {
	var result T
	err := json.Unmarshal([]byte(rowJson), &result)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal AWSVPC from JSON: %w", err)
	}

	return result, nil
}
