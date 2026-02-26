package memz

import "sync"

var (
	pool32k = sync.Pool{New: func() interface{} {
		return make([]byte, 32*1024)
	}}
	pool64k = sync.Pool{New: func() interface{} {
		return make([]byte, 64*1024)
	}}
)

func Get32k() []byte {
	return pool32k.Get().([]byte)
}

func Put32k(b []byte) {
	pool32k.Put(b) // nolint:staticcheck
}

func Get64k() []byte {
	return pool64k.Get().([]byte)
}

func Put64k(b []byte) {
	pool64k.Put(b) // nolint:staticcheck
}
