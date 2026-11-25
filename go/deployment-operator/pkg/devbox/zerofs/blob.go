package zerofs

import (
	"context"
	"errors"
	"io"

	"gocloud.dev/blob"
	"gocloud.dev/gcerrors"
)

// BlobStore deletes objects through gocloud.dev/blob. The caller registers the drivers its URLs need.
type BlobStore struct {
	Bucket *blob.Bucket
}

// DeletePrefix is idempotent: objects already gone count as deleted.
func (s BlobStore) DeletePrefix(ctx context.Context, prefix string) (int, error) {
	it := s.Bucket.List(&blob.ListOptions{Prefix: prefix})
	n := 0
	for {
		obj, err := it.Next(ctx)
		if errors.Is(err, io.EOF) {
			return n, nil
		}
		if err != nil {
			return n, err
		}
		if obj.IsDir {
			continue
		}
		if err := s.Bucket.Delete(ctx, obj.Key); err != nil && gcerrors.Code(err) != gcerrors.NotFound {
			return n, err
		}
		n++
	}
}
