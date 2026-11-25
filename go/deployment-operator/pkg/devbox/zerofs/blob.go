package zerofs

import (
	"context"
	"errors"
	"io"
	"strings"

	"gocloud.dev/blob"
	"gocloud.dev/gcerrors"
	"golang.org/x/sync/errgroup"
)

// copyParallelism bounds the server-side copies one CopyPrefix runs at once.
const copyParallelism = 16

// BlobStore reads and writes objects through gocloud.dev/blob. The caller registers the drivers its URLs need.
type BlobStore struct {
	Bucket *blob.Bucket
}

// DeletePrefix is idempotent: objects already gone count as deleted.
func (s BlobStore) DeletePrefix(ctx context.Context, prefix string) (int, error) {
	n := 0
	err := s.each(ctx, prefix, func(key string) error {
		if err := s.Bucket.Delete(ctx, key); err != nil && gcerrors.Code(err) != gcerrors.NotFound {
			return err
		}
		n++
		return nil
	})
	return n, err
}

// CopyPrefix copies every object under src to the same key under dst, server side.
func (s BlobStore) CopyPrefix(ctx context.Context, src, dst string) (int, error) {
	var keys []string
	if err := s.each(ctx, src, func(key string) error {
		keys = append(keys, key)
		return nil
	}); err != nil {
		return 0, err
	}
	g, gctx := errgroup.WithContext(ctx)
	g.SetLimit(copyParallelism)
	for _, key := range keys {
		g.Go(func() error {
			return s.Bucket.Copy(gctx, dst+strings.TrimPrefix(key, src), key, nil)
		})
	}
	return len(keys), g.Wait()
}

// Read returns an object's contents, and false if it doesn't exist.
func (s BlobStore) Read(ctx context.Context, key string) ([]byte, bool, error) {
	data, err := s.Bucket.ReadAll(ctx, key)
	if gcerrors.Code(err) == gcerrors.NotFound {
		return nil, false, nil
	}
	return data, err == nil, err
}

func (s BlobStore) Write(ctx context.Context, key string, data []byte) error {
	return s.Bucket.WriteAll(ctx, key, data, nil)
}

// Delete is idempotent.
func (s BlobStore) Delete(ctx context.Context, key string) error {
	if err := s.Bucket.Delete(ctx, key); err != nil && gcerrors.Code(err) != gcerrors.NotFound {
		return err
	}
	return nil
}

func (s BlobStore) each(ctx context.Context, prefix string, fn func(key string) error) error {
	it := s.Bucket.List(&blob.ListOptions{Prefix: prefix})
	for {
		obj, err := it.Next(ctx)
		if errors.Is(err, io.EOF) {
			return nil
		}
		if err != nil {
			return err
		}
		if obj.IsDir {
			continue
		}
		if err := fn(obj.Key); err != nil {
			return err
		}
	}
}
