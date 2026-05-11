package helpers

import (
	"fmt"
	"strings"
)

// ToStringMap should only be used for labels/annotations. It doesn't support converting inner maps.
func ToStringMap(in map[string]any) map[string]string {
	out := make(map[string]string)

	for k, v := range in {
		if s, ok := v.(string); ok {
			out[k] = s
		}
	}

	return out
}

// MergeFlat should only be used for labels/annotations. It doesn't support merging inner maps.
func MergeFlat(first, second map[string]any) map[string]any {
	result := make(map[string]any, len(first)+len(second))

	for k, v := range first {
		result[k] = v
	}

	for k, v := range second {
		result[k] = v
	}

	return result
}

func SwapBaseRegistry(registry, image string) string {
	if len(registry) == 0 || len(image) == 0 {
		return image
	}

	parts := strings.SplitN(image, "/", 2)

	// image has a registry (like "registry.plural.sh/nginx:latest")
	if len(parts) == 2 && (strings.Contains(parts[0], ".") || strings.Contains(parts[0], ":")) {
		return fmt.Sprintf("%s/%s", registry, parts[1])
	}

	// image has no registry (like "nginx:latest")
	return fmt.Sprintf("%s/%s", registry, image)
}
