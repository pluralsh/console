package worker

import (
	"context"
	"time"

	monty "github.com/ewhauser/gomonty"
)

const (
	osDateToday   monty.OSFunction = "date.today"
	osDateTimeNow monty.OSFunction = "datetime.now"
)

// handleOS exposes the only host callbacks available to sandboxed Python.
// Clock values are always derived from UTC; filesystem, environment, and all
// other OS callbacks remain unavailable.
func (m *montyRuntime) handleOS(_ context.Context, call monty.OSCall) (monty.Result, error) {
	switch call.Function {
	case osDateToday:
		if len(call.Args) != 0 || len(call.Kwargs) != 0 {
			return m.invalidClockArguments(call.Function)
		}
		return monty.Return(monty.DateValue(m.dateOf(m.utcNow()))), nil
	case osDateTimeNow:
		return m.dateTimeNow(call)
	default:
		message := "OS function " + string(call.Function) + " is not available"
		return monty.Raise(monty.Exception{Type: "NotImplementedError", Arg: &message}), nil
	}
}

func (m *montyRuntime) dateTimeNow(call monty.OSCall) (monty.Result, error) {
	if len(call.Kwargs) != 0 || len(call.Args) > 1 {
		return m.invalidClockArguments(call.Function)
	}

	now := m.dateTimeOf(m.utcNow())
	if len(call.Args) == 0 || call.Args[0].Raw() == nil {
		return monty.Return(monty.DateTimeValue(now)), nil
	}

	timezone, ok := call.Args[0].TimeZone()
	if !ok || timezone.OffsetSeconds != 0 {
		message := "datetime.now only supports UTC"
		return monty.Raise(monty.Exception{Type: "ValueError", Arg: &message}), nil
	}

	zeroOffset := int32(0)
	utcName := "UTC"
	now.OffsetSeconds = &zeroOffset
	now.TimezoneName = &utcName
	return monty.Return(monty.DateTimeValue(now)), nil
}

func (m *montyRuntime) utcNow() time.Time {
	if m.now == nil {
		return time.Now().UTC()
	}
	return m.now().UTC()
}

func (m *montyRuntime) dateOf(value time.Time) monty.Date {
	return monty.Date{
		Year:  int32(value.Year()),
		Month: uint8(value.Month()),
		Day:   uint8(value.Day()),
	}
}

func (m *montyRuntime) dateTimeOf(value time.Time) monty.DateTime {
	return monty.DateTime{
		Year:        int32(value.Year()),
		Month:       uint8(value.Month()),
		Day:         uint8(value.Day()),
		Hour:        uint8(value.Hour()),
		Minute:      uint8(value.Minute()),
		Second:      uint8(value.Second()),
		Microsecond: uint32(time.Duration(value.Nanosecond()) / time.Microsecond),
	}
}

func (m *montyRuntime) invalidClockArguments(function monty.OSFunction) (monty.Result, error) {
	message := string(function) + " received unsupported arguments"
	return monty.Raise(monty.Exception{Type: "TypeError", Arg: &message}), nil
}
