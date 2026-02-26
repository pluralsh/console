package gitlab

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"google.golang.org/protobuf/encoding/protojson"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
)

type ResponseHandlerStruct struct {
	AcceptHeader string
	HandleFunc   func(*http.Response, error) error
}

type ErrHandler func(resp *http.Response) error

func (r ResponseHandlerStruct) Handle(resp *http.Response, err error) error {
	return r.HandleFunc(resp, err)
}

func (r ResponseHandlerStruct) Accept() string {
	return r.AcceptHeader
}

func NakedResponseHandler(response **http.Response) ResponseHandler {
	return ResponseHandlerStruct{
		HandleFunc: func(r *http.Response, err error) error {
			if err != nil {
				return err
			}
			*response = r
			return nil
		},
	}
}

func JsonResponseHandler(response interface{}) ResponseHandler {
	return ResponseHandlerStruct{
		AcceptHeader: "application/json",
		HandleFunc: handleOkResponse(func(body []byte) error { // nolint:bodyclose
			if err := json.Unmarshal(body, response); err != nil {
				return fmt.Errorf("json.Unmarshal: %w", err)
			}
			return nil
		}, func(resp *http.Response) error {
			return defaultErrorHandler(resp)
		}),
	}
}

func ProtoJsonResponseHandler(response ValidatableMessage) ResponseHandler {
	return ProtoJsonResponseHandlerWithErr(response, func(resp *http.Response) error {
		return defaultErrorHandler(resp)
	})
}

func ProtoJsonResponseHandlerWithStructuredErrReason(response ValidatableMessage) ResponseHandler {
	return ProtoJsonResponseHandlerWithErr(response, defaultErrorHandlerWithReason)
}

func ProtoJsonResponseHandlerWithErr(response ValidatableMessage, errHandler ErrHandler) ResponseHandler {
	return ResponseHandlerStruct{
		AcceptHeader: "application/json",
		HandleFunc: handleOkResponse(func(body []byte) error { // nolint:bodyclose
			err := protojson.UnmarshalOptions{
				DiscardUnknown: true,
			}.Unmarshal(body, response)
			if err != nil {
				return fmt.Errorf("protojson.Unmarshal: %w", err)
			}
			if err = response.ValidateAll(); err != nil {
				return fmt.Errorf("ValidateAll: %w", err)
			}
			return nil
		}, errHandler),
	}
}

func defaultErrorHandler(resp *http.Response) *ClientError {
	path := ""
	if resp.Request != nil && resp.Request.URL != nil {
		path = resp.Request.URL.Path
	}

	return &ClientError{
		StatusCode: int32(resp.StatusCode),
		Path:       path,
	}
}

// defaultErrorHandlerWithReason tries to add an error reason from the response body.
// If no reason can be found, none is added to the response
func defaultErrorHandlerWithReason(resp *http.Response) error {
	e := defaultErrorHandler(resp)

	contentTypes := resp.Header[httpz.ContentTypeHeader]
	if len(contentTypes) == 0 {
		e.Reason = "<unknown reason: missing content type header to read reason>"
		return e
	}

	contentType := contentTypes[0]
	if !httpz.IsContentType(contentType, "application/json") {
		e.Reason = fmt.Sprintf("<unknown reason: expected application/json content type, but got %s>", contentType)
		return e
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		e.Reason = fmt.Sprintf("<unknown reason: unable to read response body: %s>", err)
		return e
	}

	var message DefaultApiError
	err = protojson.UnmarshalOptions{DiscardUnknown: true}.Unmarshal(body, &message)
	if err != nil {
		e.Reason = fmt.Sprintf("<unknown reason: %s>", err)
		return e
	}

	e.Reason = message.Message
	return e
}

func handleOkResponse(h func(body []byte) error, errHandler ErrHandler) func(*http.Response, error) error {
	return func(resp *http.Response, err error) (retErr error) {
		if err != nil {
			return err
		}
		defer errz.DiscardAndClose(resp.Body, &retErr)
		switch resp.StatusCode {
		case http.StatusOK, http.StatusCreated:
			contentType := resp.Header.Get(httpz.ContentTypeHeader)
			if !httpz.IsContentType(contentType, "application/json") {
				return fmt.Errorf("unexpected %s in response: %q", httpz.ContentTypeHeader, contentType)
			}
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return fmt.Errorf("response body read: %w", err)
			}
			return h(body)
		default: // Unexpected status
			return errHandler(resp)
		}
	}
}

// NoContentResponseHandler can be used when no response is expected or response must be discarded.
func NoContentResponseHandler() ResponseHandler {
	return ResponseHandlerStruct{
		HandleFunc: func(resp *http.Response, err error) (retErr error) {
			if err != nil {
				return err
			}
			defer errz.DiscardAndClose(resp.Body, &retErr)
			switch resp.StatusCode {
			case http.StatusOK, http.StatusNoContent:
				return nil
			default: // Unexpected status
				path := ""
				if resp.Request != nil && resp.Request.URL != nil {
					path = resp.Request.URL.Path
				}
				return &ClientError{
					StatusCode: int32(resp.StatusCode),
					Path:       path,
				}
			}
		},
	}
}
