package steampipe

import (
	"database/sql"
	"fmt"
)

const (
	// dataSourceName is the name of the SQLite database source.
	// In this case, we use an in-memory database as it is better for
	// steampipe lightweight usage.
	dataSourceName = ":memory:"
)

type Steampipe interface {
	Query(q string) (string, error)
	LoadedModules() ([]string, error)
	Close() error
}

type steampipe struct {
	db          *sql.DB
	provider    Provider
	credentials Credentials
}

func (in *steampipe) Close() error {
	return in.db.Close()
}

func (in *steampipe) init() (Steampipe, error) {
	db, err := sql.Open(driverName, dataSourceName)
	if err != nil {
		return in, err
	}

	var authQuery string
	switch in.provider {
	case ProviderAWS:
		authQuery = fmt.Sprintf(`
			SELECT steampipe_configure_aws('
				access_key="%s"
				secret_key="%s"
			');
		`, in.credentials.AWS.AccessKeyId(), in.credentials.AWS.SecretAccessKey())
	default:
		return in, fmt.Errorf("unsupported provider: %s", in.provider)
	}
	rows, err := db.Query(authQuery)
	if err != nil {
		return in, fmt.Errorf("failed to configure provider %s: %w", in.provider, err)
	}
	defer rows.Close()

	in.db = db
	return in, nil
}

// TODO: Add cache.
func NewSteampipe(provider Provider, credentials Credentials) (Steampipe, error) {
	return (&steampipe{provider: provider, credentials: credentials}).init()
}
