package elasticsearch

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	elastic "github.com/elastic/go-elasticsearch/v9"
	"github.com/elastic/go-elasticsearch/v9/esapi"
	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	k8sclient "sigs.k8s.io/controller-runtime/pkg/client"
)

type client struct {
	ctx           context.Context
	elasticsearch *elastic.Client
}

type ElasticsearchClient interface {
	Init(ctx context.Context, client k8sclient.Client, credentials *v1alpha1.ElasticsearchCredentials) error
	ClusterHealth() (*esapi.Response, error)
	PutILMPolicy(policy string, definition runtime.RawExtension) (*esapi.Response, error)
	DeleteILMPolicy(policy string) (*esapi.Response, error)
	DeleteUserRole(ctx context.Context, roleName string) (*esapi.Response, error)
	DeleteUser(ctx context.Context, username string) (*esapi.Response, error)
	CreateUser(username string, def []byte) (*esapi.Response, error)
	CreateRole(role string, def []byte) (*esapi.Response, error)
	PutIndexTemplate(name string, def []byte) (*esapi.Response, error)
	DeleteIndexTemplate(ctx context.Context, name string) (*esapi.Response, error)
}

func New() ElasticsearchClient {
	return &client{}
}

func (c *client) Init(ctx context.Context, client k8sclient.Client, credentials *v1alpha1.ElasticsearchCredentials) error {
	secret, err := utils.GetSecret(ctx, client, &corev1.SecretReference{Name: credentials.Spec.PasswordSecretKeyRef.Name, Namespace: credentials.Namespace})
	if err != nil {
		return err
	}

	key, exists := secret.Data[credentials.Spec.PasswordSecretKeyRef.Key]
	if !exists {
		return fmt.Errorf("secret %s does not contain key %s", credentials.Spec.PasswordSecretKeyRef.Name, credentials.Spec.PasswordSecretKeyRef.Key)
	}

	password := strings.ReplaceAll(string(key), "\n", "")

	esCfg := elastic.Config{
		Addresses: []string{credentials.Spec.URL},
		Username:  credentials.Spec.Username,
		Password:  password,
	}

	if lo.FromPtr(credentials.Spec.Insecure) {
		esCfg.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		}
	}

	elasticClient, err := elastic.NewClient(esCfg)
	if err != nil {
		return err
	}

	c.elasticsearch = elasticClient
	c.ctx = ctx
	return nil
}

func (c client) ClusterHealth() (*esapi.Response, error) {
	return c.elasticsearch.Cluster.Health()
}

func (c client) PutILMPolicy(policy string, definition runtime.RawExtension) (*esapi.Response, error) {
	body, err := json.Marshal(definition)
	if err != nil {
		return nil, err
	}

	return c.elasticsearch.ILM.PutLifecycle(policy, c.elasticsearch.ILM.PutLifecycle.WithBody(bytes.NewReader(body)))
}

func (c client) DeleteILMPolicy(policy string) (*esapi.Response, error) {
	return c.elasticsearch.ILM.DeleteLifecycle(policy)
}

func (c client) DeleteUserRole(ctx context.Context, roleName string) (*esapi.Response, error) {
	req := esapi.SecurityDeleteRoleRequest{
		Name: roleName,
	}

	return req.Do(ctx, c.elasticsearch)
}

func (c client) DeleteUser(ctx context.Context, username string) (*esapi.Response, error) {
	req := esapi.SecurityDeleteUserRequest{
		Username: username,
	}

	return req.Do(ctx, c.elasticsearch)
}

func (c client) CreateUser(username string, def []byte) (*esapi.Response, error) {
	return c.elasticsearch.Security.PutUser(username, bytes.NewReader(def))
}

func (c client) CreateRole(role string, def []byte) (*esapi.Response, error) {
	return c.elasticsearch.Security.PutRole(role, bytes.NewReader(def))
}

func (c client) PutIndexTemplate(name string, def []byte) (*esapi.Response, error) {
	return c.elasticsearch.Indices.PutIndexTemplate(name, bytes.NewReader(def))
}

func (c client) DeleteIndexTemplate(ctx context.Context, name string) (*esapi.Response, error) {
	return c.elasticsearch.Indices.DeleteIndexTemplate(name, c.elasticsearch.Indices.DeleteIndexTemplate.WithContext(ctx))
}
