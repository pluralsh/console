package vertex

import (
	ollamaapi "github.com/ollama/ollama/api"
	"github.com/pluralsh/polly/algorithms"
)

type Endpoint string

const (
	EndpointChat = "/v1/projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/openapi/chat/completions"
	EnvProjectID = "PROJECT_ID"
	EnvLocation  = "LOCATION"
)

type ErrorResponse struct {
	Error struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status,omitempty"`
	} `json:"error"`
}

func FromErrorResponse(statusCode int) func(response []ErrorResponse) []ollamaapi.StatusError {
	return func(in []ErrorResponse) []ollamaapi.StatusError {
		return algorithms.Map(in, func(err ErrorResponse) ollamaapi.StatusError {
			return ollamaapi.StatusError{
				StatusCode:   statusCode,
				ErrorMessage: err.Error.Message,
				Status:       err.Error.Status,
			}
		})
	}
}
