package extension

import (
	"path/filepath"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/common"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
)

const (
	registerQuery = `
		DROP EXTENSION IF EXISTS steampipe_postgres_aws CASCADE;
		CREATE EXTENSION IF NOT EXISTS steampipe_postgres_aws;

		DROP EXTENSION IF EXISTS steampipe_postgres_azure CASCADE;
		CREATE EXTENSION IF NOT EXISTS steampipe_postgres_azure;

		DROP EXTENSION IF EXISTS steampipe_postgres_gcp CASCADE;
		CREATE EXTENSION IF NOT EXISTS steampipe_postgres_gcp;
`
)

var (
	libPath          = filepath.Join(args.DatabaseRuntimeDir(), "lib/postgresql")
	extensionsPath   = filepath.Join(args.DatabaseRuntimeDir(), "share/postgresql/extension/")
	fileDestinations = map[string]string{
		"steampipe_postgres_aws.so":         libPath,
		"steampipe_postgres_aws.control":    extensionsPath,
		"steampipe_postgres_aws--1.0.sql":   extensionsPath,
		"steampipe_postgres_azure.so":       libPath,
		"steampipe_postgres_azure.control":  extensionsPath,
		"steampipe_postgres_azure--1.0.sql": extensionsPath,
		"steampipe_postgres_gcp.so":         libPath,
		"steampipe_postgres_gcp.control":    extensionsPath,
		"steampipe_postgres_gcp--1.0.sql":   extensionsPath,
	}
)

func prepare() error {
	for file, destination := range fileDestinations {
		if err := common.CopyFile(filepath.Join(args.DatabaseExtensionsDir(), file), filepath.Join(destination, file)); err != nil {
			return err
		}
	}
	return nil
}

func Register(db connection.Connection) error {
	if err := prepare(); err != nil {
		return err
	}

	_, err := db.Exec(registerQuery)
	return err
}
