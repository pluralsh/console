package lambda

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/appservice/armappservice/v2"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools"
)

type AzureProvider struct {
	conn *cloudquery.Connection
}

type azureFunctionRef struct {
	subscriptionID string
	resourceGroup  string
	siteName       string
	functionName   string
}

const azureWebsitesHostSuffix = ".azurewebsites.net"

func NewAzureProvider(conn *cloudquery.Connection) *AzureProvider {
	return &AzureProvider{conn: conn}
}

func (p *AzureProvider) Invoke(ctx context.Context, input InvocationInput) (*InvocationOutput, error) {
	ref, err := p.parseFunctionIdentifier(input.Identifier)
	if err != nil {
		return nil, err
	}

	azureConn, err := p.validateConnection(ref.subscriptionID)
	if err != nil {
		return nil, err
	}

	webAppsClient, err := p.newWebAppsClient(ref.subscriptionID, azureConn)
	if err != nil {
		return nil, err
	}

	invokeURL, err := p.resolveInvokeURL(ctx, webAppsClient, ref)
	if err != nil {
		return nil, err
	}

	if err = p.validateInvokeURL(invokeURL); err != nil {
		return nil, err
	}

	return p.invoke(ctx, invokeURL, input.Payload)
}

func (p *AzureProvider) parseFunctionIdentifier(identifier string) (azureFunctionRef, error) {
	identifier = fmt.Sprintf("/%s", strings.TrimPrefix(identifier, "/"))
	parts := strings.Split(strings.TrimSpace(identifier), "/")
	if len(parts) != 11 || parts[0] != "" ||
		!strings.EqualFold(parts[1], "subscriptions") || parts[2] == "" ||
		!strings.EqualFold(parts[3], "resourceGroups") || parts[4] == "" ||
		!strings.EqualFold(parts[5], "providers") || !strings.EqualFold(parts[6], "Microsoft.Web") ||
		!strings.EqualFold(parts[7], "sites") || parts[8] == "" ||
		!strings.EqualFold(parts[9], "functions") || parts[10] == "" {
		return azureFunctionRef{}, fmt.Errorf("%w: azure identifier must be canonical function resource id", tools.ErrInvalidArgument)
	}

	return azureFunctionRef{
		subscriptionID: parts[2],
		resourceGroup:  parts[4],
		siteName:       parts[8],
		functionName:   parts[10],
	}, nil
}

func (p *AzureProvider) validateConnection(subscriptionID string) (*cloudquery.AzureCredentials, error) {
	azureConn := p.conn.GetAzure()
	if azureConn == nil {
		return nil, fmt.Errorf("%w: azure credentials are required", tools.ErrInvalidArgument)
	}
	if strings.TrimSpace(azureConn.GetSubscriptionId()) == "" ||
		strings.TrimSpace(azureConn.GetTenantId()) == "" ||
		strings.TrimSpace(azureConn.GetClientId()) == "" ||
		strings.TrimSpace(azureConn.GetClientSecret()) == "" {
		return nil, fmt.Errorf("%w: subscription_id, tenant_id, client_id and client_secret are required", tools.ErrInvalidArgument)
	}
	if !strings.EqualFold(strings.TrimSpace(azureConn.GetSubscriptionId()), subscriptionID) {
		return nil, fmt.Errorf("%w: identifier subscription_id must match connection subscription_id", tools.ErrInvalidArgument)
	}

	return azureConn, nil
}

func (p *AzureProvider) newWebAppsClient(subscriptionID string, azureConn *cloudquery.AzureCredentials) (*armappservice.WebAppsClient, error) {
	credential, err := azidentity.NewClientSecretCredential(
		azureConn.GetTenantId(),
		azureConn.GetClientId(),
		azureConn.GetClientSecret(),
		nil,
	)
	if err != nil {
		return nil, err
	}

	return armappservice.NewWebAppsClient(subscriptionID, credential, nil)
}

func (p *AzureProvider) resolveInvokeURL(ctx context.Context, webAppsClient *armappservice.WebAppsClient, ref azureFunctionRef) (string, error) {
	invokeURL, functionKey, secretsErr := p.tryFunctionSecrets(ctx, webAppsClient, ref)
	// Flex Consumption apps don't serve function secrets, but do list the function's keys.
	if functionKey == "" {
		functionKey = p.tryFunctionKeys(ctx, webAppsClient, ref)
	}
	if functionKey == "" {
		functionKey = p.tryHostKeys(ctx, webAppsClient, ref)
	}
	if functionKey == "" {
		klog.Warningf("no key found for Azure function %s/%s/%s; invoking without one (list function secrets: %v)",
			ref.resourceGroup, ref.siteName, ref.functionName, secretsErr)
	}

	if invokeURL == "" {
		var err error
		invokeURL, err = p.getFunctionInvokeURL(ctx, webAppsClient, ref)
		if err != nil {
			if secretsErr != nil {
				return "", fmt.Errorf("list function secrets failed: %w; get function failed: %w", secretsErr, err)
			}
			return "", err
		}
	}

	invokeURL = p.withFunctionCode(invokeURL, functionKey)
	if invokeURL == "" {
		return "", fmt.Errorf("azure function invocation URL is missing")
	}

	return invokeURL, nil
}

func (p *AzureProvider) tryFunctionSecrets(ctx context.Context, webAppsClient *armappservice.WebAppsClient, ref azureFunctionRef) (invokeURL, functionKey string, err error) {
	secrets, err := webAppsClient.ListFunctionSecrets(ctx, ref.resourceGroup, ref.siteName, ref.functionName, nil)
	if err != nil {
		return "", "", err
	}

	return strings.TrimSpace(lo.FromPtr(secrets.TriggerURL)), strings.TrimSpace(lo.FromPtr(secrets.Key)), nil
}

func (p *AzureProvider) tryFunctionKeys(ctx context.Context, webAppsClient *armappservice.WebAppsClient, ref azureFunctionRef) string {
	var raw *http.Response
	keysResp, err := webAppsClient.ListFunctionKeys(policy.WithCaptureResponse(ctx, &raw), ref.resourceGroup, ref.siteName, ref.functionName, nil)
	if err != nil {
		klog.Errorf("error listing keys of Azure function %s/%s/%s: %v", ref.resourceGroup, ref.siteName, ref.functionName, err)
		return ""
	}
	if key := p.selectFunctionKey(keysResp.Properties); key != "" {
		return key
	}
	if raw == nil {
		return ""
	}

	// ARM answers with the keys at the top level, not under "properties" as the SDK expects.
	body, err := runtime.Payload(raw)
	if err != nil {
		klog.Errorf("error reading keys of Azure function %s/%s/%s: %v", ref.resourceGroup, ref.siteName, ref.functionName, err)
		return ""
	}

	return p.selectFunctionKey(parseFunctionKeys(body))
}

// parseFunctionKeys reads a listkeys response that maps key names to keys.
func parseFunctionKeys(body []byte) map[string]*string {
	var keys map[string]any
	if err := json.Unmarshal(body, &keys); err != nil {
		return nil
	}

	result := map[string]*string{}
	for name, value := range keys {
		if key, ok := value.(string); ok {
			result[name] = lo.ToPtr(key)
		}
	}

	return result
}

func (p *AzureProvider) tryHostKeys(ctx context.Context, webAppsClient *armappservice.WebAppsClient, ref azureFunctionRef) string {
	keysResp, err := webAppsClient.ListHostKeys(ctx, ref.resourceGroup, ref.siteName, nil)
	if err != nil {
		klog.Errorf("error listing host keys of Azure function app %s/%s: %v", ref.resourceGroup, ref.siteName, err)
		return ""
	}

	return p.selectHostKey(keysResp.FunctionKeys, keysResp.MasterKey, keysResp.SystemKeys)
}

func (p *AzureProvider) getFunctionInvokeURL(ctx context.Context, webAppsClient *armappservice.WebAppsClient, ref azureFunctionRef) (string, error) {
	function, err := webAppsClient.GetFunction(ctx, ref.resourceGroup, ref.siteName, ref.functionName, nil)
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(lo.FromPtr(function.Properties.InvokeURLTemplate)), nil
}

func (p *AzureProvider) validateInvokeURL(invokeURL string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(invokeURL))
	if err != nil {
		return fmt.Errorf("invalid azure function invocation URL")
	}
	if !strings.EqualFold(parsed.Scheme, "https") {
		return fmt.Errorf("azure function invocation URL must use https")
	}
	if parsed.Hostname() == "" || parsed.Port() != "" {
		return fmt.Errorf("azure function invocation URL must not include a custom port")
	}
	if parsed.User != nil || parsed.Fragment != "" {
		return fmt.Errorf("azure function invocation URL must not include user info or fragments")
	}

	host := strings.ToLower(parsed.Hostname())
	if !strings.HasSuffix(host, azureWebsitesHostSuffix) {
		return fmt.Errorf("azure function invocation URL host mismatch")
	}

	return nil
}

func (p *AzureProvider) invoke(ctx context.Context, invokeURL string, payload []byte) (*InvocationOutput, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, invokeURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
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
		output.Error = fmt.Sprintf("azure invoke failed: status=%d", resp.StatusCode)
	}

	return output, nil
}

func (p *AzureProvider) withFunctionCode(invokeURL, code string) string {
	invokeURL = strings.TrimSpace(invokeURL)
	code = strings.TrimSpace(code)

	if strings.Contains(invokeURL, "{?code}") {
		if code == "" {
			return strings.ReplaceAll(invokeURL, "{?code}", "")
		}
		return strings.ReplaceAll(invokeURL, "{?code}", "?code="+url.QueryEscape(code))
	}
	if strings.Contains(invokeURL, "{code}") {
		if code == "" {
			return strings.ReplaceAll(invokeURL, "{code}", "")
		}
		return strings.ReplaceAll(invokeURL, "{code}", url.QueryEscape(code))
	}

	parsed, err := url.Parse(invokeURL)
	if err != nil {
		return invokeURL
	}

	query := parsed.Query()
	if code == "" {
		query.Del("code")
	} else if strings.TrimSpace(query.Get("code")) == "" {
		query.Set("code", code)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

// selectFunctionKey returns the "default" key, or else any non-empty one.
func (p *AzureProvider) selectFunctionKey(keys map[string]*string) string {
	if key := strings.TrimSpace(lo.FromPtr(keys["default"])); key != "" {
		return key
	}
	for _, v := range keys {
		if key := strings.TrimSpace(lo.FromPtr(v)); key != "" {
			return key
		}
	}

	return ""
}

func (p *AzureProvider) selectHostKey(functionKeys map[string]*string, masterKey *string, systemKeys map[string]*string) string {
	if key := p.selectFunctionKey(functionKeys); key != "" {
		return key
	}

	if masterKey != nil {
		if key := strings.TrimSpace(lo.FromPtr(masterKey)); key != "" {
			return key
		}
	}

	for _, v := range systemKeys {
		if key := strings.TrimSpace(lo.FromPtr(v)); key != "" {
			return key
		}
	}

	return ""
}
