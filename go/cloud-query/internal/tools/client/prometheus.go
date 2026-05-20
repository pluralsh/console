package client

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/prometheus/client_golang/api"
	promconfig "github.com/prometheus/common/config"
	"github.com/prometheus/sigv4"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type prometheusAuthRoundTripper struct {
	base     http.RoundTripper
	token    string
	username string
	password string
	tenantID string
}

func (rt *prometheusAuthRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.base == nil {
		rt.base = api.DefaultRoundTripper
	}

	if len(req.Header.Get("Authorization")) != 0 {
		return rt.base.RoundTrip(req)
	}

	if len(rt.tenantID) > 0 {
		req.Header.Set("X-Scope-OrgID", rt.tenantID)
	}

	if len(rt.token) > 0 {
		req.Header.Set("Authorization", "Bearer "+rt.token)
		return rt.base.RoundTrip(req)
	}

	if len(rt.username) > 0 && len(rt.password) > 0 {
		req.SetBasicAuth(rt.username, rt.password)
	}

	return rt.base.RoundTrip(req)
}

func newPrometheusSigV4Config(ctx context.Context, conn *toolquery.PrometheusConnection) (*sigv4.SigV4Config, error) {
	accessKeyID := strings.TrimSpace(conn.GetAwsAccessKeyId())
	secretAccessKey := strings.TrimSpace(conn.GetAwsSecretAccessKey())
	if (accessKeyID == "") != (secretAccessKey == "") {
		return nil, fmt.Errorf("aws_access_key_id and aws_secret_access_key must be provided together")
	}

	region := strings.TrimSpace(conn.GetAwsRegion())
	cfg := &sigv4.SigV4Config{Region: region}

	if accessKeyID != "" {
		cfg.AccessKey = accessKeyID
		cfg.SecretKey = promconfig.Secret(secretAccessKey)
		return cfg, nil
	}

	// No static credentials: resolve via the AWS SDK default chain
	// (environment variables → IRSA/web identity → pod identity → instance profile).
	loadOptions := []func(*config.LoadOptions) error{}
	if region != "" {
		loadOptions = append(loadOptions, config.WithRegion(region))
	}

	awsCfg, err := config.LoadDefaultConfig(ctx, loadOptions...)
	if err != nil {
		return nil, fmt.Errorf("loading default AWS credentials for Prometheus SigV4: %w", err)
	}
	if _, err = awsCfg.Credentials.Retrieve(ctx); err != nil {
		return nil, fmt.Errorf("retrieving default AWS credentials for Prometheus SigV4: %w", err)
	}
	if region == "" {
		if awsCfg.Region == "" {
			return nil, fmt.Errorf("aws region is required for Prometheus SigV4 signing when not available from the default credential chain")
		}
		cfg.Region = awsCfg.Region
	}

	return cfg, nil
}

func NewPrometheusHTTPClient(conn *toolquery.PrometheusConnection) (*http.Client, error) {
	if conn == nil {
		return &http.Client{Transport: api.DefaultRoundTripper}, nil
	}

	base := api.DefaultRoundTripper
	if conn.GetAwsSigv4() {
		cfg, err := newPrometheusSigV4Config(context.Background(), conn)
		if err != nil {
			return nil, fmt.Errorf("invalid prometheus AWS SigV4 config: %w", err)
		}
		if err := cfg.Validate(); err != nil {
			return nil, fmt.Errorf("invalid prometheus AWS SigV4 config: %w", err)
		}
		rt, err := sigv4.NewSigV4RoundTripper(cfg, base)
		if err != nil {
			return nil, fmt.Errorf("configure prometheus AWS SigV4 signing: %w", err)
		}
		base = rt
	}

	return &http.Client{
		Transport: &prometheusAuthRoundTripper{
			base:     base,
			token:    conn.GetToken(),
			username: conn.GetUsername(),
			password: conn.GetPassword(),
			tenantID: conn.GetTenantId(),
		},
	}, nil
}
