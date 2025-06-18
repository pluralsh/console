package connection

import (
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
)

func (in *connection) Schema(table string) ([]cloudquery.SchemaResult, error) {
	klog.V(log.LogLevelDebug).InfoS("running schema query", "table", table)

	prefix := fmt.Sprintf("%s_", in.provider)
	if table != "" && !strings.HasPrefix(table, prefix) {
		return nil, fmt.Errorf("table name must start with '%s_' prefix", in.provider)
	}

	qResponse, err := in.db.Query(fmt.Sprintf(`
		SELECT table_name, column_name, data_type
		FROM information_schema.columns
		WHERE table_name LIKE '%s';`, lo.Ternary(lo.IsEmpty(table), prefix+"%", table)))
	if err != nil {
		return nil, err
	}
	defer qResponse.Close()

	schema := make(map[string][]cloudquery.SchemaColumn, 0)
	for qResponse.Next() {
		var tableName, columnName, dataType string
		if err = qResponse.Scan(&tableName, &columnName, &dataType); err != nil {
			return nil, err
		}

		if _, ok := schema[tableName]; !ok {
			schema[tableName] = []cloudquery.SchemaColumn{{
				Column: columnName,
				Type:   dataType,
			}}
			continue
		}

		schema[tableName] = append(schema[tableName], cloudquery.SchemaColumn{
			Column: columnName,
			Type:   dataType,
		})
	}

	result := make([]cloudquery.SchemaResult, 0, len(schema))
	for tableName, columns := range schema {
		result = append(result, cloudquery.SchemaResult{
			Table:   tableName,
			Columns: lo.ToSlicePtr(columns),
		})
	}
	return result, nil
}
