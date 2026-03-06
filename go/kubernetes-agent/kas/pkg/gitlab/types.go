package gitlab

import (
	"context"
)

type ClientInterface interface {
	Do(ctx context.Context, opts ...DoOption) error
}
