package api

import (
	"encoding/json"
	"maps"

	tfjson "github.com/hashicorp/terraform-json"
	"github.com/mitchellh/copystructure"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
)

func OutputValueString(value any) string {
	if v, ok := value.(string); ok {
		return v
	}

	result, err := json.Marshal(value)
	if err != nil {
		klog.ErrorS(err, "unable to marshal tf state output", "value", value)
		return ""
	}

	return string(result)
}

func CloneMap(m map[string]any) map[string]any {
	c, err := copystructure.Copy(m)
	if err != nil {
		return maps.Clone(m) // Return shallow copy if deep copy fails.
	}

	return c.(map[string]any)
}

func ExcludeSensitiveValues(values map[string]any, sensitiveValues map[string]any) {
	for key, sensitiveValue := range sensitiveValues {
		switch typedSensitiveValue := sensitiveValue.(type) {
		case map[string]any:
			if outValue, ok := values[key]; ok {
				if typedOutValue, ok := outValue.(map[string]any); ok {
					ExcludeSensitiveValues(typedOutValue, typedSensitiveValue)
					continue
				}
			}
		case bool:
			if typedSensitiveValue {
				delete(values, key)
			}
		}
	}
}

func ResourceConfiguration(resource *tfjson.StateResource) string {
	values := CloneMap(resource.AttributeValues)
	ExcludeSensitiveValues(values, ResourceSensitiveValues(resource))
	attributeValuesString, _ := json.Marshal(values)
	return string(attributeValuesString)
}

func ResourceSensitiveValues(resource *tfjson.StateResource) map[string]any {
	sensitiveValues := make(map[string]any)
	_ = json.Unmarshal(resource.SensitiveValues, &sensitiveValues)
	return sensitiveValues
}

func ResourceLinks(resource *tfjson.StateResource) []string {
	return resource.DependsOn
}

func ToStackStateResourceAttributesList(resources []*tfjson.StateResource) []*console.StackStateResourceAttributes {
	return algorithms.Filter(
		algorithms.Map(resources, ToStackStateResourceAttributes),
		func(r *console.StackStateResourceAttributes) bool {
			return r != nil
		},
	)
}

func ToStackStateResourceAttributes(resource *tfjson.StateResource) *console.StackStateResourceAttributes {
	if resource == nil {
		return nil
	}

	return &console.StackStateResourceAttributes{
		Identifier:    resource.Address,
		Resource:      resource.Type,
		Name:          resource.Name,
		Configuration: lo.ToPtr(ResourceConfiguration(resource)),
		Links:         lo.ToSlicePtr(resource.DependsOn),
	}
}
