package proxy

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream"
)

const (
	eventStreamContentType = "application/vnd.amazon.eventstream"
	bedrockMetricsKey      = "amazon-bedrock-invocationMetrics"
	maxSSELineBytes        = 16 << 20
)

// streamForwarder turns upstream Anthropic stream events, framed either as AWS event-stream
// chunks (Bedrock invoke-with-response-stream) or as SSE, into client-facing SSE events.
type streamForwarder struct {
	out   *sseWriter
	model string
	done  bool
}

func forwardStream(body io.Reader, contentType, model string, out *sseWriter) error {
	f := &streamForwarder{out: out, model: model}

	var err error
	mediaType, _, _ := mime.ParseMediaType(contentType)
	if mediaType == "text/event-stream" {
		err = f.readSSE(body)
	} else {
		err = f.readEventStream(body)
	}

	var writeErr *clientWriteError
	if errors.As(err, &writeErr) {
		return writeErr.err
	}
	if err != nil {
		return out.error(upstreamFailure("gateway stream failed: " + err.Error()))
	}
	if !f.done {
		return out.error(upstreamFailure("gateway stream ended before message_stop"))
	}
	return nil
}

// clientWriteError marks failures writing to the client, which end the stream silently
// instead of producing an error event nobody can receive.
type clientWriteError struct{ err error }

func (e *clientWriteError) Error() string { return e.err.Error() }

func (f *streamForwarder) readEventStream(body io.Reader) error {
	decoder := eventstream.NewDecoder()
	var buf []byte
	for !f.done {
		msg, err := decoder.Decode(body, buf)
		if errors.Is(err, io.EOF) {
			return nil
		}
		if err != nil {
			return fmt.Errorf("decoding event stream: %w", err)
		}
		buf = msg.Payload[:0]

		switch headerString(msg.Headers, ":message-type") {
		case "event":
			if headerString(msg.Headers, ":event-type") != "chunk" {
				continue
			}
			var chunk struct {
				Bytes []byte `json:"bytes"`
			}
			if err := json.Unmarshal(msg.Payload, &chunk); err != nil {
				return fmt.Errorf("decoding chunk: %w", err)
			}
			if err := f.forward(chunk.Bytes); err != nil {
				return err
			}
		case "exception", "error":
			name := headerString(msg.Headers, ":exception-type")
			if name == "" {
				name = headerString(msg.Headers, ":error-code")
			}
			return f.fail(&APIError{
				Status:  500,
				Type:    streamExceptionType(name),
				Message: exceptionMessage(name, msg),
			})
		}
	}
	return nil
}

func (f *streamForwarder) readSSE(body io.Reader) error {
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 64<<10), maxSSELineBytes)

	var data strings.Builder
	flush := func() error {
		if data.Len() == 0 {
			return nil
		}
		payload := data.String()
		data.Reset()
		return f.forward([]byte(payload))
	}

	for scanner.Scan() && !f.done {
		line := scanner.Text()
		switch {
		case line == "":
			if err := flush(); err != nil {
				return err
			}
		case strings.HasPrefix(line, "data:"):
			if data.Len() > 0 {
				data.WriteByte('\n')
			}
			data.WriteString(strings.TrimPrefix(strings.TrimPrefix(line, "data:"), " "))
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	if f.done {
		return nil
	}
	return flush()
}

// forward normalizes one Anthropic stream event and writes it to the client.
func (f *streamForwarder) forward(payload []byte) error {
	var event map[string]json.RawMessage
	if err := json.Unmarshal(payload, &event); err != nil {
		return fmt.Errorf("decoding stream event: %w", err)
	}
	var eventType string
	if err := json.Unmarshal(event["type"], &eventType); err != nil || eventType == "" {
		return fmt.Errorf("stream event missing type")
	}

	delete(event, bedrockMetricsKey)

	switch eventType {
	case "message_start":
		if f.model != "" {
			event["message"] = withModel(event["message"], f.model)
		}
	case "message_stop":
		f.done = true
	case "error":
		f.done = true
	}

	encoded, err := json.Marshal(event)
	if err != nil {
		return err
	}
	if err := f.out.sendRaw(eventType, encoded); err != nil {
		return &clientWriteError{err}
	}
	return nil
}

func (f *streamForwarder) fail(e *APIError) error {
	f.done = true
	if err := f.out.error(e); err != nil {
		return &clientWriteError{err}
	}
	return nil
}

func withModel(raw json.RawMessage, model string) json.RawMessage {
	var msg map[string]json.RawMessage
	if err := json.Unmarshal(raw, &msg); err != nil || msg == nil {
		return raw
	}
	msg["model"] = mustMarshal(model)
	return mustMarshal(msg)
}

func headerString(headers eventstream.Headers, name string) string {
	v := headers.Get(name)
	if v == nil {
		return ""
	}
	return v.String()
}

func exceptionMessage(name string, msg eventstream.Message) string {
	var body struct {
		Message string `json:"message"`
	}
	text := strings.TrimSpace(string(msg.Payload))
	if json.Unmarshal(msg.Payload, &body) == nil && body.Message != "" {
		text = body.Message
	}
	if text == "" {
		text = headerString(msg.Headers, ":error-message")
	}
	if name != "" {
		return fmt.Sprintf("%s: %s", name, text)
	}
	return text
}
