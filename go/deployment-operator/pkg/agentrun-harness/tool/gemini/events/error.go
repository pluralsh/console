package events

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
)

type Severity string

const (
	ErrorSeverityWarning Severity = "warning"
	ErrorSeverityError   Severity = "error"
)

func (s Severity) String() string {
	switch s {
	case ErrorSeverityWarning:
		return "Warning"
	case ErrorSeverityError:
		return "Error"
	default:
		return "Error"
	}
}

type ErrorEvent struct {
	EventBase
	Severity Severity `json:"severity"`
	Message  string   `json:"message"`
}

func (e *ErrorEvent) Validate() bool {
	return e.Type == EventTypeError && e.Message != ""
}

func (e *ErrorEvent) Process(onMessage func(message *console.AgentMessageAttributes)) {
	onMessage(e.Attributes())
}

func (e *ErrorEvent) Attributes() *console.AgentMessageAttributes {
	return &console.AgentMessageAttributes{
		Role:    console.AiRoleSystem,
		Message: fmt.Sprintf("%s: %s", e.Severity.String(), e.Message),
	}
}
