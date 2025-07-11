package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/common"
)

func checkDatabaseHealth(ctx context.Context) error {
	// Create a database connection using the same configuration as the main application
	dataSource := common.DataSource(
		args.DatabaseHost(),
		args.DatabasePort(),
		args.DatabaseName(),
		args.DatabaseUser(),
		args.DatabasePassword(),
	)

	db, err := sql.Open("postgres", dataSource)
	if err != nil {
		return fmt.Errorf("failed to open database connection: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err = db.PingContext(pingCtx)
	if err != nil {
		return fmt.Errorf("database connection failed: %w", err)
	}

	return db.Close()
}

// healthz creates an HTTP handler for the health endpoint
func healthz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	err := checkDatabaseHealth(ctx)

	if err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(fmt.Sprintf("%v\n", err)))
	} else {
		w.WriteHeader(http.StatusOK)
	}
}
