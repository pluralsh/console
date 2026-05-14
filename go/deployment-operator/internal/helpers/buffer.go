package helpers

import (
	"bytes"
	"sync"
	"time"

	"k8s.io/apimachinery/pkg/util/wait"
)

// Buffer is an internal buffer wrapper to ensure that Write/Read
// operations are thread-safe and cannot be run at the same time.
// It also starts a small goroutine that notifies about buffer
// size changes through channel. See Updated method for more information.
type Buffer struct {
	*bytes.Buffer

	size       int
	lastSize   int
	updateChan chan struct{}
	mu         sync.Mutex
}

// Write implements io.Writer interface.
// It ensures thread-safe execution.
func (b *Buffer) Write(p []byte) (n int, err error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	n, err = b.Buffer.Write(p)
	b.size = b.Buffer.Len()
	return
}

// Next overrides bytes.Buffer method.
// It ensures thread-safe execution.
func (b *Buffer) Next(n int) []byte {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.Buffer.Next(n)
}

// ReadBytes overrides bytes.Buffer method.
// It ensures thread-safe execution.
func (b *Buffer) ReadBytes(delim byte) (line []byte, err error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.Buffer.ReadBytes(delim)
}

// String overrides bytes.Buffer method.
// It ensures thread-safe execution.
func (b *Buffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.Buffer.String()
}

// Len overrides bytes.Buffer method.
// It ensures thread-safe execution.
func (b *Buffer) Len() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.Buffer.Len()
}

// Updated returns a channel that receives signal
// every time buffer size gets updated.
func (b *Buffer) Updated() chan struct{} {
	return b.updateChan
}

func (b *Buffer) startSizeWatcher() {
	go wait.Until(func() {
		if b.size != b.lastSize {
			b.updateChan <- struct{}{}
			b.lastSize = b.size
		}
	}, 100*time.Millisecond, wait.NeverStop)
}

func (b *Buffer) init() *Buffer {
	b.startSizeWatcher()

	return b
}

func NewBuffer() *Buffer {
	return (&Buffer{
		Buffer:     bytes.NewBuffer([]byte{}),
		updateChan: make(chan struct{}),
	}).init()
}
