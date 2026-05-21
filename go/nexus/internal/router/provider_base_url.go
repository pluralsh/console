package router

import "strings"

// bifrostNetworkBaseURL normalizes Console deployment base URLs for Bifrost providers.
// Console and ReqLLM use OpenAI-SDK-style bases that include /v1; Bifrost providers
// append /v1/... request paths to a host-level base URL instead.
func bifrostNetworkBaseURL(baseURL string) string {
	baseURL = strings.TrimSpace(baseURL)
	baseURL = strings.TrimRight(baseURL, "/")
	if strings.HasSuffix(baseURL, "/v1") {
		return strings.TrimSuffix(baseURL, "/v1")
	}
	return baseURL
}

// bedrockNetworkBaseURL normalizes custom Bedrock-compatible proxy base URLs for Bifrost.
func bedrockNetworkBaseURL(baseURL string) string {
	return strings.TrimRight(strings.TrimSpace(baseURL), "/")
}
