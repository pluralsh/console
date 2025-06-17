package postgres

import (
	"context"
	"database/sql"
	"fmt"

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
