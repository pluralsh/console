package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	k8sclient "sigs.k8s.io/controller-runtime/pkg/client"
)

const ERRCODE_DATABES_NOT_FOUND = "3D000"

type client struct {
	ctx        context.Context
	connection string
}

type Client interface {
	Init(ctx context.Context, client k8sclient.Client, credentials *v1alpha1.PostgresCredentials) error
	Ping() error
	DatabaseExists(database string) (bool, error)
	DeleteDatabase(dbName string) error
	UpsertDatabase(dbName string) error
	UpsertUser(username, password string) error
	DeleteUser(username string) error
	SetDatabaseOwner(database, username string) error
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
		Path:   credentials.Spec.Database,
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
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	// Check if database exists
	query := `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1);`
	if err := db.QueryRow(query, dbName).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check if database exists: %w", err)
	}

	if !exists {
		return nil
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
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == ERRCODE_DATABES_NOT_FOUND {
			return nil
		}
		return fmt.Errorf("failed to drop database %q: %w", dbName, err)
	}

	return nil
}

func (c *client) UpsertDatabase(dbName string) error {
	db, err := sql.Open("pgx", c.connection)
	if err != nil {
		return err
	}
	defer func(db *sql.DB) {
		if err := db.Close(); err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	// Check if database exists
	var exists bool
	err = db.QueryRow(`SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)`, dbName).Scan(&exists)
	if err != nil {
		return fmt.Errorf("checking database existence: %w", err)
	}

	if exists {
		ctrl.LoggerFrom(c.ctx).Info("database already exists", "database", dbName)
		return nil
	}

	// Create database
	_, err = db.Exec(fmt.Sprintf(`CREATE DATABASE "%s"`, dbName))
	if err != nil {
		return fmt.Errorf("creating database: %w", err)
	}

	ctrl.LoggerFrom(c.ctx).Info("database created", "database", dbName)
	return nil
}

func (c *client) DatabaseExists(database string) (bool, error) {
	db, err := sql.Open("pgx", c.connection)
	if err != nil {
		return false, err
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	var exists bool
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM pg_database WHERE datname = $1
		)
	`, database).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking database existence: %w", err)
	}

	return exists, nil
}

func (c *client) UpsertUser(username, password string) error {
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

	// Check if user exists
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = $1)`
	err = db.QueryRow(query, username).Scan(&exists)
	if err != nil {
		return fmt.Errorf("checking user existence: %w", err)
	}

	if exists {
		// Update password
		_, err = db.Exec(fmt.Sprintf(`ALTER USER "%s" WITH PASSWORD '%s'`, username, password))
		if err != nil {
			return fmt.Errorf("updating user password: %w", err)
		}
		return nil
	}

	// Create new user
	_, err = db.Exec(fmt.Sprintf(`CREATE USER "%s" WITH PASSWORD '%s'`, username, password))
	if err != nil {
		return fmt.Errorf("creating user: %w", err)
	}
	ctrl.LoggerFrom(c.ctx).Info("created user", "user", username)

	return nil
}

func (c *client) DeleteUser(username string) error {
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

	// Drop user
	_, err = db.Exec(fmt.Sprintf(`DROP USER IF EXISTS "%s"`, username))
	if err != nil {
		return fmt.Errorf("dropping user: %w", err)
	}
	ctrl.LoggerFrom(c.ctx).Info("user deleted", "username", username)

	return nil
}

func (c *client) SetDatabaseOwner(database, username string) error {
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

	// Get current owner
	var currentOwner string
	err = db.QueryRow(`
		SELECT pg_catalog.pg_get_userbyid(d.datdba)
		FROM pg_catalog.pg_database d
		WHERE d.datname = $1
	`, database).Scan(&currentOwner)
	if err != nil {
		return fmt.Errorf("fetching database owner: %w", err)
	}

	// Only update if different
	if currentOwner == username {
		return nil
	}

	// Set new owner
	query := fmt.Sprintf(`GRANT ALL PRIVILEGES ON DATABASE %s TO %s`, database, username)
	_, err = db.Exec(query)
	if err != nil {
		return fmt.Errorf("setting database owner: %w", err)
	}

	return nil
}
