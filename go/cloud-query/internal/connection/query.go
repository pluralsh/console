package connection

import (
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

func (in *connection) Query(q string) (columns []string, rows [][]any, err error) {
	klog.V(log.LogLevelDebug).InfoS("running query", "query", q)

	qResponse, err := in.db.Query(q)
	if err != nil {
		return columns, rows, err
	}
	defer qResponse.Close()

	columns, err = qResponse.Columns()
	if err != nil {
		return columns, rows, err
	}

	for qResponse.Next() {
		values := make([]any, len(columns))
		pointers := make([]any, len(columns))
		for i := range values {
			pointers[i] = &values[i]
		}

		if err = qResponse.Scan(pointers...); err != nil {
			return columns, rows, err
		}

		rows = append(rows, values)
	}

	return columns, rows, err
}
