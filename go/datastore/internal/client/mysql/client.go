package mysql

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
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

type MySqlClient interface {
	Init(ctx context.Context, client k8sclient.Client, credentials *v1alpha1.MySqlCredentials) error
	Ping() error
	DatabaseExists(database string) (bool, error)
	DeleteDatabase(dbName string) error
	UpsertDatabase(dbName string) error
	UpsertUser(username, password string) error
	DeleteUser(username string) error
	SetDatabaseOwner(database, username string) error
}

func New() MySqlClient {
	return &client{}
}

func (c *client) Init(ctx context.Context, client k8sclient.Client, credentials *v1alpha1.MySqlCredentials) error {
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
		Scheme: "mysql",
		User:   url.UserPassword(credentials.Spec.Username, password),
		Host:   fmt.Sprintf("%s:%d", credentials.Spec.Host, credentials.Spec.Port),
		Path:   "/",
	}

	q := u.Query()
	if lo.FromPtr(credentials.Spec.Insecure) {
		q.Set("tls", "skip-verify")
	}
	u.RawQuery = q.Encode()

	c.connection = fmt.Sprintf("%s@tcp(%s)%s?%s",
		u.User.String(),
		u.Host,
		u.Path,
		u.RawQuery,
	)
	c.ctx = ctx

	return nil
}

func (c *client) Ping() error {
	// Connect
	db, err := sql.Open("mysql", c.connection)
	if err != nil {
		return err
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)

	// Ping to check connection
	if err := db.Ping(); err != nil {
		return err
	}
	return nil
}

func (c *client) DeleteDatabase(dbName string) error {
	db, err := sql.Open("mysql", c.connection)
	if err != nil {
		return err
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)
	// Delete database if it exists
	query := fmt.Sprintf("DROP DATABASE IF EXISTS `%s`", dbName)
	_, err = db.ExecContext(c.ctx, query)
	if err != nil {
		ctrl.LoggerFrom(c.ctx).Error(err, "failed to delete database", "dbName", dbName)
		return err
	}
	return nil
}

func (c *client) UpsertDatabase(dbName string) error {
	db, err := sql.Open("mysql", c.connection)
	if err != nil {
		return err
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)

	// Create database if it doesn't exist
	query := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s`", dbName)
	_, err = db.ExecContext(c.ctx, query)
	if err != nil {
		ctrl.LoggerFrom(c.ctx).Error(err, "failed to create database", "dbName", dbName)
		return err
	}

	return nil
}

func (c *client) DatabaseExists(database string) (bool, error) {
	db, err := sql.Open("mysql", c.connection)
	if err != nil {
		return false, err
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)
	// Query to check if database exists
	query := `
		SELECT EXISTS (
			SELECT SCHEMA_NAME
			FROM INFORMATION_SCHEMA.SCHEMATA
			WHERE SCHEMA_NAME = ?
		)
	`

	var exists bool
	err = db.QueryRowContext(c.ctx, query, database).Scan(&exists)
	if err != nil {
		ctrl.LoggerFrom(c.ctx).Error(err, "failed to check database existence", "database", database)
		return false, err
	}

	return exists, nil
}

func (c *client) UpsertUser(username, password string) error {
	db, err := sql.Open("mysql", c.connection)
	if err != nil {
		return err
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)

	// Create user if not exists
	createQuery := fmt.Sprintf("CREATE USER IF NOT EXISTS '%s'@'%%' IDENTIFIED BY '%s'", username, password)
	_, err = db.ExecContext(c.ctx, createQuery)
	if err != nil {
		ctrl.LoggerFrom(c.ctx).Error(err, "failed to create user", "username", username)
		return err
	}

	// Update user password
	alterQuery := fmt.Sprintf("ALTER USER '%s'@'%%' IDENTIFIED BY '%s'", username, password)
	_, err = db.ExecContext(c.ctx, alterQuery)
	if err != nil {
		ctrl.LoggerFrom(c.ctx).Error(err, "failed to update user password", "username", username)
		return err
	}

	return nil
}

func (c *client) DeleteUser(username string) error {
	db, err := sql.Open("mysql", c.connection)
	if err != nil {
		return err
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)

	// Drop user if exists
	query := fmt.Sprintf("DROP USER IF EXISTS '%s'@'%%'", username)
	_, err = db.ExecContext(c.ctx, query)
	if err != nil {
		ctrl.LoggerFrom(c.ctx).Error(err, "failed to delete user", "username", username)
		return err
	}

	return nil
}

func (c *client) SetDatabaseOwner(database, username string) error {
	db, err := sql.Open("mysql", c.connection)
	if err != nil {
		return err
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			ctrl.LoggerFrom(c.ctx).Error(err, "failed to close connection")
		}
	}(db)

	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)

	// Grant all privileges on the database to the user
	query := fmt.Sprintf("GRANT ALL PRIVILEGES ON `%s`.* TO '%s'@'%%'", database, username)
	_, err = db.ExecContext(c.ctx, query)
	if err != nil {
		ctrl.LoggerFrom(c.ctx).Error(err, "failed to grant privileges", "database", database, "username", username)
		return err
	}

	return nil
}
