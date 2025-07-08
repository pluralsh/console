package extractor

import (
	"encoding/json"
	"fmt"

	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// Table represents a table name in the cloud query system.
type Table string

// Entry represents a mapping between a table name and a resource factory function.
type Entry struct {
	Table   Table
	Factory ResourceFactory
}

// Extractor is an interface that defines the methods required for extracting resources
// from a cloud provider.
type Extractor interface {
	// Extract extracts resources from the provided connection and sends it to the sink.
	Extract(connection.Connection) error

	// Sink returns a Sink that is used to send the extracted output.
	Sink() Sink

	// Resources return an ordered list of resources to extract. It is used to determine the order of extraction.
	Resources() []Entry
}

// Sink is an interface that defines the method for sending extracted output.
type Sink interface {
	Send(output *cloudquery.ExtractOutput) error
}

// Resource is an interface that defines the methods required to extract information
// used by the extractor.
type Resource interface {
	// ID returns the unique identifier of the resource, i.e. the ARN for AWS resources.
	ID() string

	// ShortID returns a shorter identifier for the resource.
	// It might not be globally unique for the provider i.e., the name or id of the resource for AWS resources.
	ShortID() string

	// Links returns a list of links related to the resource.
	// The lookup map is used to resolve short IDs to full IDs.
	Links(lookup map[string]string) []string
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
