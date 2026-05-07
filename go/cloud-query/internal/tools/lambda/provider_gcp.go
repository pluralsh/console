package lambda

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"google.golang.org/api/idtoken"
	"google.golang.org/api/option"
	runv2 "google.golang.org/api/run/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools"
)

type GCPProvider struct {
	conn *cloudquery.Connection
}

const cloudRunHostSuffix = ".run.app"

func NewGCPProvider(conn *cloudquery.Connection) *GCPProvider {
	return &GCPProvider{conn: conn}
}

func (in *GCPProvider) Invoke(ctx context.Context, input InvocationInput) (*InvocationOutput, error) {
	gcpConn := in.conn.GetGcp()
	if gcpConn == nil {
		return nil, fmt.Errorf("%w: gcp credentials are required", tools.ErrInvalidArgument)
	}

	serviceAccountJSON, err := base64.StdEncoding.DecodeString(gcpConn.GetServiceAccountJsonB64())
	if err != nil {
		return nil, fmt.Errorf("%w: invalid gcp service account json", tools.ErrInvalidArgument)
	}

	identifier := strings.TrimSpace(input.Identifier)
	fnURI, isURL, err := in.toInvocationURI(identifier)
	if err != nil {
		return nil, err
	}
	if !isURL {
		fnURI, err = in.getServiceURI(ctx, serviceAccountJSON, fnURI)
		if err != nil {
			return nil, err
		}
	}

	if err := in.validateCloudRunURL(fnURI); err != nil {
		return nil, err
	}

	return in.invoke(ctx, fnURI, serviceAccountJSON, input)
}

func (in *GCPProvider) toServiceName(identifier string) (string, error) {
	parts := strings.Split(identifier, "/")
	if len(parts) == 6 && parts[0] == "projects" && parts[2] == "locations" && parts[4] == "services" &&
		parts[1] != "" && parts[3] != "" && parts[5] != "" {
		return fmt.Sprintf("projects/%s/locations/%s/services/%s", parts[1], parts[3], parts[5]), nil
	}

	return "", fmt.Errorf("%w: gcp identifier must be projects/{project}/locations/{location}/services/{name}", tools.ErrInvalidArgument)
}

func (in *GCPProvider) toInvocationURI(identifier string) (uri string, isURL bool, err error) {
	if strings.Contains(identifier, "://") {
		if err := in.validateCloudRunURL(identifier); err != nil {
			return "", true, err
		}
		return identifier, true, nil
	}

	serviceName, err := in.toServiceName(identifier)
	if err != nil {
		return "", false, err
	}

	return serviceName, false, nil
}

func (in *GCPProvider) validateCloudRunURL(value string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(value))
	if err != nil {
		return fmt.Errorf("%w: invalid gcp cloud run url", tools.ErrInvalidArgument)
	}
	if !strings.EqualFold(parsed.Scheme, "https") {
		return fmt.Errorf("%w: gcp cloud run url must use https", tools.ErrInvalidArgument)
	}
	if parsed.Hostname() == "" || parsed.Port() != "" {
		return fmt.Errorf("%w: gcp cloud run url must not include a custom port", tools.ErrInvalidArgument)
	}
	if parsed.User != nil || parsed.Fragment != "" {
		return fmt.Errorf("%w: gcp cloud run url must not include user info or fragments", tools.ErrInvalidArgument)
	}

	host := strings.ToLower(parsed.Hostname())
	if host == "run.app" || !strings.HasSuffix(host, cloudRunHostSuffix) {
		return fmt.Errorf("%w: gcp cloud run url host must end with %s", tools.ErrInvalidArgument, cloudRunHostSuffix)
	}

	return nil
}

func (in *GCPProvider) getServiceURI(ctx context.Context, serviceAccountJSON []byte, serviceName string) (string, error) {
	runService, err := runv2.NewService(
		ctx,
		option.WithCredentialsJSON(serviceAccountJSON),
		option.WithScopes(runv2.CloudPlatformScope),
	)
	if err != nil {
		return "", err
	}

	svc, err := runService.Projects.Locations.Services.Get(serviceName).Context(ctx).Do()
	if err != nil {
		return "", err
	}

	return svc.Uri, nil
}

func (in *GCPProvider) invoke(ctx context.Context, uri string, serviceAccountJSON []byte, input InvocationInput) (*InvocationOutput, error) {
	httpClient, err := idtoken.NewClient(ctx, uri, option.WithCredentialsJSON(serviceAccountJSON))
	if err != nil {
		return nil, err
	}
	httpClient.Timeout = 30 * time.Second

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uri, bytes.NewReader(input.Payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	output := &InvocationOutput{
		Result: strings.TrimSpace(string(body)),
	}
	if resp.StatusCode >= http.StatusBadRequest {
		output.Error = fmt.Sprintf("gcp invoke failed: status=%d", resp.StatusCode)
	}

	return output, nil
}
