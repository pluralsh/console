package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	e "github.com/pluralsh/console/go/datastore/internal/client/elasticsearch"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
)

// adjustIndexDefinitionForCreate demotes is_write_index on aliases that already
// have another write index. This prevents recreate-after-ILM-delete of a
// bootstrap index (e.g. plrl-logs-000001) from conflicting with a rolled write index.
func adjustIndexDefinitionForCreate(ctx context.Context, es e.ElasticsearchClient, indexName string, definition runtime.RawExtension) (runtime.RawExtension, error) {
	writeAliases, err := writeAliasesFromDefinition(definition)
	if err != nil {
		return definition, err
	}
	if len(writeAliases) == 0 {
		return definition, nil
	}

	for _, alias := range writeAliases {
		hasOtherWrite, err := aliasHasOtherWriteIndex(ctx, es, alias, indexName)
		if err != nil {
			return definition, err
		}
		if hasOtherWrite {
			ctrl.LoggerFrom(ctx).Info(
				"alias already has a write index; creating without is_write_index",
				"index", indexName,
				"alias", alias,
			)
			return demoteWriteAliases(definition)
		}
	}

	return definition, nil
}

func writeAliasesFromDefinition(definition runtime.RawExtension) ([]string, error) {
	raw, err := definitionJSON(definition)
	if err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return nil, nil
	}

	var body struct {
		Aliases map[string]struct {
			IsWriteIndex *bool `json:"is_write_index"`
		} `json:"aliases"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		return nil, fmt.Errorf("parse index definition: %w", err)
	}

	var aliases []string
	for name, meta := range body.Aliases {
		if meta.IsWriteIndex != nil && *meta.IsWriteIndex {
			aliases = append(aliases, name)
		}
	}
	return aliases, nil
}

func demoteWriteAliases(definition runtime.RawExtension) (runtime.RawExtension, error) {
	raw, err := definitionJSON(definition)
	if err != nil {
		return definition, err
	}

	var body map[string]json.RawMessage
	if err := json.Unmarshal(raw, &body); err != nil {
		return definition, fmt.Errorf("parse index definition: %w", err)
	}

	aliasesRaw, ok := body["aliases"]
	if !ok {
		return definition, nil
	}

	var aliases map[string]map[string]interface{}
	if err := json.Unmarshal(aliasesRaw, &aliases); err != nil {
		return definition, fmt.Errorf("parse index aliases: %w", err)
	}

	for name, meta := range aliases {
		if meta == nil {
			meta = map[string]interface{}{}
		}
		if write, exists := meta["is_write_index"]; exists {
			if b, ok := write.(bool); ok && b {
				meta["is_write_index"] = false
				aliases[name] = meta
			}
		}
	}

	encodedAliases, err := json.Marshal(aliases)
	if err != nil {
		return definition, err
	}
	body["aliases"] = encodedAliases

	encoded, err := json.Marshal(body)
	if err != nil {
		return definition, err
	}
	return runtime.RawExtension{Raw: encoded}, nil
}

func aliasHasOtherWriteIndex(ctx context.Context, es e.ElasticsearchClient, alias, creatingIndex string) (bool, error) {
	res, err := es.GetAlias(ctx, alias)
	if err != nil {
		return false, err
	}
	defer func() {
		if res != nil && res.Body != nil {
			_ = res.Body.Close()
		}
	}()

	if res.StatusCode == http.StatusNotFound {
		return false, nil
	}
	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		return false, fmt.Errorf("failed to get alias %s: %s", alias, string(body))
	}

	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return false, err
	}

	// GET _alias/{name} → { "<index>": { "aliases": { "<alias>": { "is_write_index": true } } } }
	var aliasBody map[string]struct {
		Aliases map[string]struct {
			IsWriteIndex *bool `json:"is_write_index"`
		} `json:"aliases"`
	}
	if err := json.Unmarshal(raw, &aliasBody); err != nil {
		return false, fmt.Errorf("parse alias response: %w", err)
	}

	for indexName, meta := range aliasBody {
		if indexName == creatingIndex {
			continue
		}
		aliasMeta, ok := meta.Aliases[alias]
		if !ok || aliasMeta.IsWriteIndex == nil {
			continue
		}
		if *aliasMeta.IsWriteIndex {
			return true, nil
		}
	}

	return false, nil
}

func definitionJSON(definition runtime.RawExtension) ([]byte, error) {
	if len(definition.Raw) > 0 {
		return definition.Raw, nil
	}
	if definition.Object != nil {
		return json.Marshal(definition.Object)
	}
	return nil, nil
}
