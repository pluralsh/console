package elasticsearch

import (
	"context"
	"crypto/tls"

	elastic "github.com/elastic/go-elasticsearch/v9"
	"github.com/elastic/go-elasticsearch/v9/esapi"
	"net/http"
)

type client struct {
	ctx           context.Context
	elasticsearch *elastic.Client
}

type ElasticsearchClient interface {
	ClusterHealth() (*esapi.Response, error)
}

func New(ctx context.Context, url, username, password string, insecure *bool) (ElasticsearchClient, error) {
	esCfg := elastic.Config{
		Addresses: []string{url},
		Username:  username,
		Password:  password,
	}
	if insecure != nil && *insecure {
		esCfg.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		}
	}
	elasticClient, err := elastic.NewClient(esCfg)
	if err != nil {
		return nil, err
	}
	return &client{
		ctx:           ctx,
		elasticsearch: elasticClient,
	}, nil
}

func (c client) ClusterHealth() (*esapi.Response, error) {
	return c.elasticsearch.Cluster.Health()
}
