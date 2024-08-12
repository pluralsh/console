/*
MIT License

Copyright (c) 2020 Microsoft Azure

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

package auth

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/Azure/msi-acrpull/pkg/authorizer/types"
)

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	Resource     string `json:"resource"`
	TokenType    string `json:"token_type"`
}

func closeResponse(resp *http.Response) {
	if resp == nil {
		return
	}
	resp.Body.Close()
}

// TokenExchanger is an instance of ACRTokenExchanger
type TokenExchanger struct {
	acrServerScheme string
}

// NewTokenExchanger returns a new token exchanger
func NewTokenExchanger() *TokenExchanger {
	return &TokenExchanger{
		acrServerScheme: "https",
	}
}

// ExchangeACRAccessToken exchanges an ARM access token to an ACR access token
func (te *TokenExchanger) ExchangeACRAccessToken(armToken types.AccessToken, acrFQDN string) (types.AccessToken, error) {
	tenantID, err := armToken.GetTokenTenantId()
	if err != nil {
		return "", fmt.Errorf("failed to get tenant id from ARM token: %w", err)
	}

	scheme := te.acrServerScheme
	if scheme == "" {
		scheme = "https"
	}

	exchangeURL := fmt.Sprintf("%s://%s/oauth2/exchange", scheme, acrFQDN)
	ul, err := url.Parse(exchangeURL)
	if err != nil {
		return "", fmt.Errorf("failed to parse token exchange url: %w", err)
	}
	parameters := url.Values{}
	parameters.Add("grant_type", "access_token")
	parameters.Add("service", ul.Hostname())
	parameters.Add("tenant", tenantID)
	parameters.Add("access_token", string(armToken))

	req, err := http.NewRequest("POST", exchangeURL, strings.NewReader(parameters.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to construct token exchange reqeust: %w", err)
	}

	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Add("Content-Length", strconv.Itoa(len(parameters.Encode())))

	client := &http.Client{}
	var resp *http.Response
	defer closeResponse(resp)

	resp, err = client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send token exchange request: %w", err)
	}

	if resp.StatusCode != 200 {
		responseBytes, _ := ioutil.ReadAll(resp.Body)
		return "", fmt.Errorf("ACR token exchange endpoint returned error status: %d. body: %s", resp.StatusCode, string(responseBytes))
	}

	responseBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read request body: %w", err)
	}

	var tokenResp tokenResponse
	err = json.Unmarshal(responseBytes, &tokenResp)
	if err != nil {
		return "", fmt.Errorf("failed to read token exchange response: %w. response: %s", err, string(responseBytes))
	}

	return types.AccessToken(tokenResp.RefreshToken), nil
}
