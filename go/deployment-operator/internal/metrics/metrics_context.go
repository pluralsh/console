package metrics

import (
	"context"
	"fmt"

	"github.com/samber/lo"
)

func FromContext[T any](ctx context.Context, key ContextKey) (T, error) {
	v := ctx.Value(key)
	if v == nil {
		return lo.Empty[T](), fmt.Errorf("could not get value for key: %v", key)
	}

	val, ok := v.(T)
	if !ok {
		return lo.Empty[T](), fmt.Errorf("could not cast value for key: %v", key)
	}

	return val, nil
}
