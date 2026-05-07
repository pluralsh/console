package lambda

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/appservice/armappservice/v2"
	"github.com/samber/lo"

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
	if functionKey == "" {
		functionKey = p.tryHostKeys(ctx, webAppsClient, ref)
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

func (p *AzureProvider) tryHostKeys(ctx context.Context, webAppsClient *armappservice.WebAppsClient, ref azureFunctionRef) string {
	keysResp, err := webAppsClient.ListHostKeys(ctx, ref.resourceGroup, ref.siteName, nil)
	if err != nil {
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

func (p *AzureProvider) selectHostKey(functionKeys map[string]*string, masterKey *string, systemKeys map[string]*string) string {
	if len(functionKeys) > 0 {
		if def, ok := functionKeys["default"]; ok {
			if key := strings.TrimSpace(lo.FromPtr(def)); key != "" {
				return key
			}
		}
		for _, v := range functionKeys {
			if key := strings.TrimSpace(lo.FromPtr(v)); key != "" {
				return key
			}
		}
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
