package tools

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	signer "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/datasource"
)

const opensearchAWSServiceName = "es"

type OpensearchProvider struct {
	client *http.Client
	conn   *toolquery.OpensearchConnection
}

func NewOpensearchProvider(conn *toolquery.OpensearchConnection) (LogsProvider, error) {
	return (&OpensearchProvider{conn: conn}).init()
}

func (in *OpensearchProvider) init() (LogsProvider, error) {
	client, err := in.newOpensearchClient()
	if err != nil {
		return nil, err
	}

	in.client = client
	return in, nil
}

func (in *OpensearchProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || input.Query == "" {
		return nil, ErrInvalidArgument
	}

	body, err := json.Marshal((&ElasticProvider{}).toRequest(input))
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, in.searchURL(), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := in.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("opensearch search failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var result opensearchSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.toLogsQueryOutput()
}

func (in *OpensearchProvider) searchURL() string {
	return fmt.Sprintf("%s/%s/_search", strings.TrimRight(in.conn.GetHost(), "/"), strings.TrimLeft(in.conn.GetIndex(), "/"))
}

func (in *OpensearchProvider) newOpensearchClient() (*http.Client, error) {
	if len(in.conn.GetHost()) == 0 {
		return nil, fmt.Errorf("%w: missing host", ErrInvalidArgument)
	}

	if len(in.conn.GetIndex()) == 0 {
		return nil, fmt.Errorf("%w: missing index", ErrInvalidArgument)
	}

	transport, err := opensearchSigV4RoundTripper(context.Background(), in.conn, http.DefaultTransport)
	if err != nil {
		return nil, err
	}

	return &http.Client{Transport: transport}, nil
}

type opensearchSearchResponse struct {
	Hits struct {
		Hits []struct {
			Source json.RawMessage `json:"_source"`
		} `json:"hits"`
	} `json:"hits"`
}

func (in *opensearchSearchResponse) toLogsQueryOutput() (*toolquery.LogsQueryOutput, error) {
	logs := make([]*toolquery.LogEntry, 0)
	for _, hit := range in.Hits.Hits {
		if len(hit.Source) == 0 {
			continue
		}

		var source datasource.ElasticSource
		if err := json.Unmarshal(hit.Source, &source); err != nil {
			return nil, err
		}

		logEntry, err := source.ToLogsQueryOutput()
		if err != nil {
			return nil, err
		}
		logs = append(logs, logEntry)
	}

	return &toolquery.LogsQueryOutput{Logs: logs}, nil
}

func opensearchSigV4RoundTripper(ctx context.Context, conn *toolquery.OpensearchConnection, base http.RoundTripper) (http.RoundTripper, error) {
	accessKeyID := strings.TrimSpace(conn.GetAwsAccessKeyId())
	secretAccessKey := strings.TrimSpace(conn.GetAwsSecretAccessKey())
	if (accessKeyID == "") != (secretAccessKey == "") {
		return nil, fmt.Errorf("%w: aws_access_key_id and aws_secret_access_key must be provided together", ErrInvalidArgument)
	}

	loadOptions := []func(*config.LoadOptions) error{}
	if region := strings.TrimSpace(conn.GetAwsRegion()); region != "" {
		loadOptions = append(loadOptions, config.WithRegion(region))
	}
	if accessKeyID != "" {
		loadOptions = append(loadOptions, config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
		))
	} else if !conn.GetUsePodIdentity() {
		return nil, fmt.Errorf("%w: aws_access_key_id and aws_secret_access_key are required when pod identity is disabled", ErrInvalidArgument)
	}

	cfg, err := config.LoadDefaultConfig(ctx, loadOptions...)
	if err != nil {
		return nil, err
	}

	region := strings.TrimSpace(conn.GetAwsRegion())
	if region == "" {
		region = cfg.Region
	}
	if region == "" {
		return nil, fmt.Errorf("%w: aws_region is required when it cannot be inferred from the AWS credential chain", ErrInvalidArgument)
	}

	provider := cfg.Credentials
	if roleARN := strings.TrimSpace(conn.GetAssumeRoleArn()); roleARN != "" {
		provider = aws.CredentialsProviderFunc(func(ctx context.Context) (aws.Credentials, error) {
			return cachedAssumeRoleCredentials(ctx, cfg, roleARN)
		})
	}

	return &awsSigV4RoundTripper{
		base:        base,
		credentials: aws.NewCredentialsCache(provider),
		region:      region,
		service:     opensearchAWSServiceName,
		signer:      signer.NewSigner(),
	}, nil
}

type awsSigV4RoundTripper struct {
	base        http.RoundTripper
	credentials *aws.CredentialsCache
	region      string
	service     string
	signer      *signer.Signer
}

func (rt *awsSigV4RoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	var body []byte
	if req.Body != nil {
		var err error
		body, err = io.ReadAll(req.Body)
		if err != nil {
			return nil, err
		}
		_ = req.Body.Close()
		req.Body = io.NopCloser(bytes.NewReader(body))
	}

	hash := sha256.Sum256(body)
	req.Header.Set("X-Amz-Content-Sha256", hex.EncodeToString(hash[:]))

	signedReq := req.Clone(req.Context())
	signedReq.Body = io.NopCloser(bytes.NewReader(body))
	creds, err := rt.credentials.Retrieve(req.Context())
	if err != nil {
		return nil, err
	}
	if err := rt.signer.SignHTTP(req.Context(), creds, signedReq, hex.EncodeToString(hash[:]), rt.service, rt.region, time.Now().UTC()); err != nil {
		return nil, err
	}

	return rt.base.RoundTrip(signedReq)
}
