package proxy

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// sseWriter writes Anthropic-style server-sent events and flushes after each one.
type sseWriter struct {
	w       io.Writer
	flusher http.Flusher
}

func newSSEWriter(w io.Writer) *sseWriter {
	f, _ := w.(http.Flusher)
	return &sseWriter{w: w, flusher: f}
}

func (s *sseWriter) send(event string, data any) error {
	payload, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return s.sendRaw(event, payload)
}

func (s *sseWriter) sendRaw(event string, payload []byte) error {
	if _, err := fmt.Fprintf(s.w, "event: %s\ndata: %s\n\n", event, payload); err != nil {
		return err
	}
	if s.flusher != nil {
		s.flusher.Flush()
	}
	return nil
}

func (s *sseWriter) ping() error {
	return s.sendRaw("ping", []byte(`{"type":"ping"}`))
}

func (s *sseWriter) error(e *APIError) error {
	return s.send("error", e.body())
}

func setSSEHeaders(h http.Header) {
	h.Set("Content-Type", "text/event-stream; charset=utf-8")
	h.Set("Cache-Control", "no-cache")
	h.Set("Connection", "keep-alive")
	h.Set("X-Accel-Buffering", "no")
}
