package modagent

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestApplyRequestOptions(t *testing.T) {
	tests := []struct {
		name           string
		opts           []GitLabRequestOption
		expectedMethod string
		expectedHeader http.Header
		expectedQuery  url.Values
		expectedBody   []byte
		expectedErr    string
	}{
		{
			name:           "defaults",
			expectedMethod: http.MethodGet,
			expectedHeader: http.Header{},
			expectedQuery:  url.Values{},
		},
		{
			name: "typical usage",
			opts: []GitLabRequestOption{
				WithRequestMethod(http.MethodGet),
				WithRequestHeader("xx1", "x1", "x2"),
				WithRequestHeader("xx2", "x3", "x4"),
				WithRequestQueryParam("z1", "z1", "z2"),
				WithRequestQueryParam("z2", "z3", "z4"),
				WithRequestBody(bytes.NewReader([]byte{1, 2, 3}), "bla"),
			},
			expectedMethod: http.MethodGet,
			expectedHeader: http.Header{
				"Xx1":          []string{"x1", "x2"},
				"Xx2":          []string{"x3", "x4"},
				"Content-Type": []string{"bla"},
			},
			expectedQuery: url.Values{
				"z1": []string{"z1", "z2"},
				"z2": []string{"z3", "z4"},
			},
			expectedBody: []byte{1, 2, 3},
		},
		{
			name: "nil body",
			opts: []GitLabRequestOption{
				WithRequestBody(nil, "bla"),
			},
			expectedMethod: http.MethodGet,
			expectedHeader: http.Header{},
			expectedQuery:  url.Values{},
		},
		{
			name: "json body",
			opts: []GitLabRequestOption{
				WithJsonRequestBody(struct {
					A int
				}{
					A: 42,
				}),
			},
			expectedMethod: http.MethodGet,
			expectedHeader: http.Header{
				"Content-Type": []string{"application/json"},
			},
			expectedQuery: url.Values{},
			expectedBody:  []byte(`{"A":42}`),
		},
		{
			name: "json marshaling error",
			opts: []GitLabRequestOption{
				WithJsonRequestBody(&invalidJson{}),
			},
			expectedErr: "WithJsonRequestBody: json: error calling MarshalJSON for type *modagent.invalidJson: boom",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			config, err := ApplyRequestOptions(tc.opts)
			if tc.expectedErr != "" {
				assert.EqualError(t, err, tc.expectedErr)
				assert.Nil(t, config)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedMethod, config.Method)
				assert.Equal(t, tc.expectedHeader, config.Header)
				assert.Equal(t, tc.expectedQuery, config.Query)
				var body []byte
				if config.Body != nil {
					body, err = io.ReadAll(config.Body)
					require.NoError(t, err)
				}
				assert.Equal(t, tc.expectedBody, body)
			}
		})
	}
}

func TestApplyRequestOptions_BodyClosedOnError(t *testing.T) {
	c := &closeableReader{}
	_, err := ApplyRequestOptions([]GitLabRequestOption{
		WithRequestBody(c, ""),
		WithJsonRequestBody(&invalidJson{}),
	})
	assert.EqualError(t, err, "WithJsonRequestBody: json: error calling MarshalJSON for type *modagent.invalidJson: boom")
	assert.True(t, c.closed)
}

type invalidJson struct{}

func (i *invalidJson) MarshalJSON() ([]byte, error) {
	return nil, errors.New("boom")
}

type closeableReader struct {
	closed bool
}

func (c *closeableReader) Read(d []byte) (int, error) {
	return 0, nil
}

func (c *closeableReader) Close() error {
	c.closed = true
	return nil
}
