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
	"io"
	"net/http"
	"net/url"
	"path"
)

const defaultCacheExpirationInSeconds = 600

// ExchangeACRAccessToken exchanges an ARM access token to an ACR access token.
func ExchangeACRAccessToken(endpoint, accessToken string) (string, error) {
	exchangeURL, err := url.Parse(endpoint)
	if err != nil {
		return "", err
	}
	exchangeURL.Path = path.Join(exchangeURL.Path, "oauth2/exchange")

	parameters := url.Values{}
	parameters.Add("grant_type", "access_token")
	parameters.Add("service", exchangeURL.Hostname())
	parameters.Add("access_token", accessToken)

	response, err := http.PostForm(exchangeURL.String(), parameters)
	if err != nil {
		return "", fmt.Errorf("failed to send token exchange request: %w", err)
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read request body: %w", err)
	}

	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ACR token exchange endpoint returned error status: %d, response: %s",
			response.StatusCode, string(responseBody))
	}

	var tokenResponse struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		Resource     string `json:"resource"`
		TokenType    string `json:"token_type"`
	}
	err = json.Unmarshal(responseBody, &tokenResponse)
	if err != nil {
		return "", fmt.Errorf("failed to read token exchange response: %w, response: %s", err, string(responseBody))
	}

	return tokenResponse.RefreshToken, nil
}
