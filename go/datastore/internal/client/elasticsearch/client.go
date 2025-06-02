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
