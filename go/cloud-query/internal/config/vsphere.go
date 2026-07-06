package config

import (
	"encoding/json"
	"fmt"

	"github.com/lib/pq"
	"github.com/samber/lo"
)

type VSphereConfiguration struct {
	server             *string
	user               *string
	password           *string
	allowUnverifiedSSL *bool
}

func (c *VSphereConfiguration) Query(connectionName string) (string, error) {
	if c == nil {
		return "", fmt.Errorf("vsphere configuration is nil")
	}
	if lo.FromPtr(c.server) == "" {
		return "", fmt.Errorf("vsphere server is required")
	}
	if lo.FromPtr(c.user) == "" {
		return "", fmt.Errorf("vsphere user is required")
	}
	if lo.FromPtr(c.password) == "" {
		return "", fmt.Errorf("vsphere password is required")
	}

	return c.buildQuery(connectionName), nil
}

func (c *VSphereConfiguration) buildQuery(connectionName string) string {
	query := fmt.Sprintf(`
		DROP SERVER IF EXISTS %[1]s;
		CREATE SERVER %[1]s FOREIGN DATA WRAPPER steampipe_postgres_vsphere OPTIONS (
			config '
				vsphere_server=%[2]q
				user=%[3]q
				password=%[4]q
	`,
		pq.QuoteIdentifier("steampipe_"+connectionName),
		lo.FromPtr(c.server),
		lo.FromPtr(c.user),
		lo.FromPtr(c.password),
	)

	if c.allowUnverifiedSSL != nil {
		query += fmt.Sprintf("			allow_unverified_ssl=%t\n", lo.FromPtr(c.allowUnverifiedSSL))
	}

	query += fmt.Sprintf(`
		');
		IMPORT FOREIGN SCHEMA %[1]s FROM SERVER %[2]s INTO %[1]s;
	`,
		pq.QuoteIdentifier(connectionName),
		pq.QuoteIdentifier("steampipe_"+connectionName),
	)

	return query
}

func (c *VSphereConfiguration) MarshalJSON() ([]byte, error) {
	return json.Marshal(&struct {
		Server             *string `json:"server,omitempty"`
		User               *string `json:"user,omitempty"`
		Password           *string `json:"password,omitempty"`
		AllowUnverifiedSSL *bool   `json:"allowUnverifiedSSL,omitempty"`
	}{
		Server:             c.server,
		User:               c.user,
		Password:           c.password,
		AllowUnverifiedSSL: c.allowUnverifiedSSL,
	})
}

func WithVSphereServer(server string) func(*Configuration) {
	return func(c *Configuration) {
		c.vsphere.server = &server
	}
}

func WithVSphereUser(user string) func(*Configuration) {
	return func(c *Configuration) {
		c.vsphere.user = &user
	}
}

func WithVSpherePassword(password string) func(*Configuration) {
	return func(c *Configuration) {
		c.vsphere.password = &password
	}
}

func WithVSphereAllowUnverifiedSSL(allowUnverifiedSSL bool) func(*Configuration) {
	return func(c *Configuration) {
		c.vsphere.allowUnverifiedSSL = &allowUnverifiedSSL
	}
}
