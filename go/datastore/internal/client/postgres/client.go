package postgres

import (
	"context"
	"database/sql"
	"fmt"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"net/url"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	k8sclient "sigs.k8s.io/controller-runtime/pkg/client"
)

type client struct {
	ctx        context.Context
	connection string
}

type Client interface {
	Init(ctx context.Context, client k8sclient.Client, credentials *v1alpha1.PostgresCredentials) error
	Ping() error
	DeleteDatabase(dbName string) error
	UpsertDatabase(dbName string) error
}

func New() Client {
	return &client{}
}

func (c *client) Init(ctx context.Context, client k8sclient.Client, credentials *v1alpha1.PostgresCredentials) error {
	secret, err := utils.GetSecret(ctx, client, &corev1.SecretReference{Name: credentials.Spec.PasswordSecretKeyRef.Name, Namespace: credentials.Namespace})
	if err != nil {
		return err
	}

	key, exists := secret.Data[credentials.Spec.PasswordSecretKeyRef.Key]
	if !exists {
		return fmt.Errorf("secret %s does not contain key %s", credentials.Spec.PasswordSecretKeyRef.Name, credentials.Spec.PasswordSecretKeyRef.Key)
	}

	password := strings.ReplaceAll(string(key), "\n", "")

	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(credentials.Spec.Username, password),
		Host:   fmt.Sprintf("%s:%d", credentials.Spec.Host, credentials.Spec.Port),
		Path:   "postgres",
	}

	q := u.Query()
	if lo.FromPtr(credentials.Spec.Insecure) {
		q.Add("sslmode", "disable")
	}
	u.RawQuery = q.Encode()
	c.connection = u.String()
	c.ctx = ctx

	return nil
}

func (c *client) Ping() error {
	// Connect
	db, err := sql.Open("pgx", c.connection)
	if err != nil {
		return err
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	// Ping to check connection
	if err := db.Ping(); err != nil {
		return err
	}
	return nil
}

func (c *client) DeleteDatabase(dbName string) error {
	var exists bool
	db, err := sql.Open("pgx", c.connection)
	if err != nil {
		return err
	}
	// Check if database exists
	query := `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1);`
	if err := db.QueryRow(query, dbName).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check if database exists: %w", err)
	}

	if !exists {
		// Return a Kubernetes-style NotFound error
		return k8serrors.NewNotFound(
			schema.GroupResource{Group: "database", Resource: "PostgreSQLDatabase"},
			dbName,
		)
	}

	// Terminate existing connections to the database
	_, err = db.Exec(`
		SELECT pg_terminate_backend(pid)
		FROM pg_stat_activity
		WHERE datname = $1 AND pid <> pg_backend_pid();
	`, dbName)
	if err != nil {
		return fmt.Errorf("failed to terminate connections to %q: %w", dbName, err)
	}

	// Drop the database
	_, err = db.Exec(fmt.Sprintf(`DROP DATABASE "%s"`, dbName))
	if err != nil {
		return fmt.Errorf("failed to drop database %q: %w", dbName, err)
	}

	return nil
}

func (c *client) UpsertDatabase(dbName string) error {
	var exists bool
	db, err := sql.Open("pgx", c.connection)
	if err != nil {
		return err
	}

	query := `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1);`
	err = db.QueryRow(query, dbName).Scan(&exists)
	if err != nil {
		return fmt.Errorf("checking database existence: %w", err)
	}

	if exists {
		return nil
	}

	// Create the database
	_, err = db.Exec(fmt.Sprintf(`CREATE DATABASE "%s"`, dbName))
	if err != nil {
		return fmt.Errorf("creating database: %w", err)
	}

	return nil
}
