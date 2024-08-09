package auth

type Provider string

const (
	AWS   Provider = "AWS"
	Azure Provider = "AZURE"
	GCP   Provider = "GCP"
)

type AuthenticationRequest struct {
	URL      string            `json:"url"`
	Provider Provider          `json:"provider"`
	AWS      *AWSCredentials   `json:"aws,omitempty"`
	Azure    *AzureCredentials `json:"azure,omitempty"`
	GCP      *AWSCredentials   `json:"gcp,omitempty"`
}

type AWSCredentials struct {
	AccessKeyID     *string `json:"accessKeyID,omitempty"`
	SecretAccessKey *string `json:"secretAccessKey,omitempty"`
	AssumeRoleARN   *string `json:"assumeRoleARN,omitempty"`
}

type AzureCredentials struct {
	SubscriptionID *string `json:"subscriptionID,omitempty"`
	TenantID       *string `json:"tenantID,omitempty"`
	ClientID       *string `json:"clientID,omitempty"`
	ClientSecret   *string `json:"clientSecret,omitempty"`
}

type GCPCredentials struct {
	ApplicationCredentials *string `json:"applicationCredentials,omitempty"`
}
