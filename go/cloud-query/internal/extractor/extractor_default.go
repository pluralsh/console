package extractor

import (
	"fmt"

	"github.com/lib/pq"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/common"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// DefaultExtractor is the default implementation of the Extractor interface.
// It extracts data from a database connection and sends it to a sink.
// It uses a map of resource factories to create resource objects from the extracted data.
// It is designed to be used with a variety of cloud providers by providing the necessary resource factories.
type DefaultExtractor struct {
	sink      Sink
	resources map[string]ResourceFactory
}

// Extract extracts data from the provided connection and sends it to the sink.
func (in DefaultExtractor) Extract(conn connection.Connection) error {
	klog.V(log.LogLevelDebug).InfoS("starting extraction")

	for table, factory := range in.Resources() {
		columns, rows, err := conn.Query("SELECT * FROM" + pq.QuoteIdentifier(table))
		if err != nil {
			return fmt.Errorf("failed to query table '%s': %w", table, err)
		}

		klog.V(log.LogLevelDebug).InfoS("extracting table", "table", table, "columns", len(columns), "rows", len(rows))
		for _, row := range rows {
			klog.V(log.LogLevelTrace).InfoS("processing row", "table", table, "row", row)
			rowJson, err := common.ToRowJSON(columns, row)
			if err != nil {
				klog.V(log.LogLevelVerbose).ErrorS(err, "failed to convert row to JSON", "table", table, "row", row)
				continue
			}

			itable, err := factory(rowJson)
			if err != nil {
				return fmt.Errorf("could not create table interface: %w", err)
			}

			output := &cloudquery.ExtractOutput{
				Type:   table,
				Result: rowJson,
				Id:     itable.ID(),
				Links:  itable.Links(),
			}

			if err := in.Sink().Send(output); err != nil {
				return fmt.Errorf("failed to send output: %w", err)
			}
		}
	}

	klog.V(log.LogLevelDebug).InfoS("extraction completed")
	return nil
}

func (in DefaultExtractor) Sink() Sink {
	return in.sink
}

func (in DefaultExtractor) Resources() map[string]ResourceFactory {
	return in.resources
}

func NewDefaultExtractor(sink Sink, resources map[string]ResourceFactory) Extractor {
	return DefaultExtractor{
		sink:      sink,
		resources: resources,
	}
}
