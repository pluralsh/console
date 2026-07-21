package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/elastic/go-elasticsearch/v9/esapi"
	"github.com/pluralsh/console/go/datastore/internal/test/mocks"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/runtime"
)

func TestWriteAliasesFromDefinition(t *testing.T) {
	aliases, err := writeAliasesFromDefinition(runtime.RawExtension{Raw: []byte(`{
		"aliases": {
			"plrl-logs-write": { "is_write_index": true },
			"other": { "is_write_index": false }
		}
	}`)})
	require.NoError(t, err)
	require.Equal(t, []string{"plrl-logs-write"}, aliases)
}

func TestDemoteWriteAliases(t *testing.T) {
	out, err := demoteWriteAliases(runtime.RawExtension{Raw: []byte(`{
		"settings": { "number_of_shards": 1 },
		"aliases": {
			"plrl-logs-write": { "is_write_index": true }
		}
	}`)})
	require.NoError(t, err)

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(out.Raw, &body))
	aliases := body["aliases"].(map[string]interface{})
	write := aliases["plrl-logs-write"].(map[string]interface{})
	require.Equal(t, false, write["is_write_index"])
	require.Equal(t, float64(1), body["settings"].(map[string]interface{})["number_of_shards"])
}

func TestAdjustIndexDefinitionForCreateDemotesWhenAliasHasWrite(t *testing.T) {
	ctx := context.Background()
	fake := mocks.NewElasticsearchClientMock(t)
	fake.On("GetAlias", mock.Anything, "plrl-logs-write").Return(&esapi.Response{
		StatusCode: http.StatusOK,
		Body: io.NopCloser(bytes.NewBufferString(`{
			"plrl-logs-000005": {
				"aliases": {
					"plrl-logs-write": { "is_write_index": true }
				}
			}
		}`)),
	}, nil)

	def := runtime.RawExtension{Raw: []byte(`{
		"aliases": {
			"plrl-logs-write": { "is_write_index": true }
		}
	}`)}

	out, err := adjustIndexDefinitionForCreate(ctx, fake, "plrl-logs-000001", def)
	require.NoError(t, err)

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(out.Raw, &body))
	write := body["aliases"].(map[string]interface{})["plrl-logs-write"].(map[string]interface{})
	require.Equal(t, false, write["is_write_index"])
}

func TestAdjustIndexDefinitionForCreateKeepsWriteWhenAliasMissing(t *testing.T) {
	ctx := context.Background()
	fake := mocks.NewElasticsearchClientMock(t)
	fake.On("GetAlias", mock.Anything, "plrl-logs-write").Return(&esapi.Response{
		StatusCode: http.StatusNotFound,
		Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
	}, nil)

	def := runtime.RawExtension{Raw: []byte(`{
		"aliases": {
			"plrl-logs-write": { "is_write_index": true }
		}
	}`)}

	out, err := adjustIndexDefinitionForCreate(ctx, fake, "plrl-logs-000001", def)
	require.NoError(t, err)
	require.JSONEq(t, string(def.Raw), string(out.Raw))
}
