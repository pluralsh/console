package openaiproxy

import (
	"encoding/json"
	"fmt"

	"github.com/openai/openai-go/responses"
	"github.com/openai/openai-go/shared/constant"
)

// StreamEventsFromResponse converts a non-streaming response into OpenAI Responses API SSE event payloads.
func StreamEventsFromResponse(response responses.Response) ([]json.RawMessage, error) {
	var events []json.RawMessage
	seq := int64(0)

	completed, err := rawObject(response.RawJSON(), response)
	if err != nil {
		return nil, err
	}
	shell := withFields(completed, map[string]any{"output": nil, "status": string(responses.ResponseStatusInProgress)})

	events = append(events, responseEvent("response.created", shell, &seq))
	events = append(events, responseEvent("response.in_progress", shell, &seq))

	for outputIndex, item := range response.Output {
		itemEvents, err := streamEventsForOutputItem(item, int64(outputIndex), &seq)
		if err != nil {
			return nil, err
		}
		events = append(events, itemEvents...)
	}

	events = append(events, responseEvent("response.completed", completed, &seq))

	return events, nil
}

func streamEventsForOutputItem(item responses.ResponseOutputItemUnion, outputIndex int64, seq *int64) ([]json.RawMessage, error) {
	switch item.Type {
	case "message":
		return streamEventsForMessage(item.AsMessage(), outputIndex, seq)
	case "function_call":
		return streamEventsForFunctionCall(item.AsFunctionCall(), outputIndex, seq)
	default:
		return streamEventsForGenericItem(item, outputIndex, seq)
	}
}

func streamEventsForMessage(message responses.ResponseOutputMessage, outputIndex int64, seq *int64) ([]json.RawMessage, error) {
	var events []json.RawMessage

	completedItem, err := rawObject(message.RawJSON(), message)
	if err != nil {
		return nil, err
	}

	inProgress := withFields(completedItem, map[string]any{"status": string(responses.ResponseOutputMessageStatusInProgress), "content": []any{}})
	events = append(events, itemEvent("response.output_item.added", inProgress, outputIndex, seq))

	for contentIndex, content := range message.Content {
		switch content.Type {
		case "output_text":
			events = append(events, mustEventJSON(responses.ResponseContentPartAddedEvent{
				ContentIndex: int64(contentIndex),
				ItemID:       message.ID,
				OutputIndex:  outputIndex,
				Part: responses.ResponseContentPartAddedEventPartUnion{
					Type: "output_text",
					Text: "",
				},
				SequenceNumber: nextSeq(seq),
				Type:           constant.ResponseContentPartAdded("response.content_part.added"),
			}))
			events = append(events, mustEventJSON(responses.ResponseTextDeltaEvent{
				ContentIndex:   int64(contentIndex),
				Delta:          content.Text,
				ItemID:         message.ID,
				OutputIndex:    outputIndex,
				SequenceNumber: nextSeq(seq),
				Type:           constant.ResponseOutputTextDelta("response.output_text.delta"),
			}))
			events = append(events, mustEventJSON(responses.ResponseTextDoneEvent{
				ContentIndex:   int64(contentIndex),
				ItemID:         message.ID,
				OutputIndex:    outputIndex,
				SequenceNumber: nextSeq(seq),
				Text:           content.Text,
				Type:           constant.ResponseOutputTextDone("response.output_text.done"),
			}))
			events = append(events, mustEventJSON(responses.ResponseContentPartDoneEvent{
				ContentIndex: int64(contentIndex),
				ItemID:       message.ID,
				OutputIndex:  outputIndex,
				Part: responses.ResponseContentPartDoneEventPartUnion{
					Type: "output_text",
					Text: content.Text,
				},
				SequenceNumber: nextSeq(seq),
				Type:           constant.ResponseContentPartDone("response.content_part.done"),
			}))
		case "refusal":
			events = append(events, mustEventJSON(responses.ResponseContentPartAddedEvent{
				ContentIndex: int64(contentIndex),
				ItemID:       message.ID,
				OutputIndex:  outputIndex,
				Part: responses.ResponseContentPartAddedEventPartUnion{
					Type:    "refusal",
					Refusal: "",
				},
				SequenceNumber: nextSeq(seq),
				Type:           constant.ResponseContentPartAdded("response.content_part.added"),
			}))
			events = append(events, mustEventJSON(responses.ResponseContentPartDoneEvent{
				ContentIndex: int64(contentIndex),
				ItemID:       message.ID,
				OutputIndex:  outputIndex,
				Part: responses.ResponseContentPartDoneEventPartUnion{
					Type:    "refusal",
					Refusal: content.Refusal,
				},
				SequenceNumber: nextSeq(seq),
				Type:           constant.ResponseContentPartDone("response.content_part.done"),
			}))
		}
	}

	events = append(events, itemEvent("response.output_item.done", completedItem, outputIndex, seq))

	return events, nil
}

func streamEventsForFunctionCall(call responses.ResponseFunctionToolCall, outputIndex int64, seq *int64) ([]json.RawMessage, error) {
	events := make([]json.RawMessage, 0, 4)

	item, err := rawObject(call.RawJSON(), call)
	if err != nil {
		return nil, err
	}

	events = append(events, itemEvent("response.output_item.added", withFields(item, map[string]any{"status": "in_progress"}), outputIndex, seq))
	events = append(events, mustEventJSON(responses.ResponseFunctionCallArgumentsDeltaEvent{
		Delta:          call.Arguments,
		ItemID:         call.ID,
		OutputIndex:    outputIndex,
		SequenceNumber: nextSeq(seq),
		Type:           constant.ResponseFunctionCallArgumentsDelta("response.function_call_arguments.delta"),
	}))
	events = append(events, mustEventJSON(responses.ResponseFunctionCallArgumentsDoneEvent{
		Arguments:      call.Arguments,
		ItemID:         call.ID,
		OutputIndex:    outputIndex,
		SequenceNumber: nextSeq(seq),
		Type:           constant.ResponseFunctionCallArgumentsDone("response.function_call_arguments.done"),
	}))

	events = append(events, itemEvent("response.output_item.done", withFields(item, map[string]any{"status": "completed"}), outputIndex, seq))

	return events, nil
}

func streamEventsForGenericItem(item responses.ResponseOutputItemUnion, outputIndex int64, seq *int64) ([]json.RawMessage, error) {
	raw, err := rawObject(item.RawJSON(), item)
	if err != nil {
		return nil, err
	}

	return []json.RawMessage{
		itemEvent("response.output_item.added", withFields(raw, map[string]any{"status": "in_progress"}), outputIndex, seq),
		itemEvent("response.output_item.done", withFields(raw, map[string]any{"status": "completed"}), outputIndex, seq),
	}, nil
}

// rawObject decodes the JSON Console sent rather than re-encoding the SDK type, which drops fields the SDK
// doesn't model (such as a function call's namespace) that clients must send back unchanged.
func rawObject(raw string, typed any) (map[string]any, error) {
	data := []byte(raw)
	if raw == "" {
		var err error
		if data, err = json.Marshal(typed); err != nil {
			return nil, fmt.Errorf("marshal %T: %w", typed, err)
		}
	}

	var object map[string]any
	if err := json.Unmarshal(data, &object); err != nil {
		return nil, fmt.Errorf("unmarshal %T: %w", typed, err)
	}
	return object, nil
}

// withFields returns a copy of object with fields set.
func withFields(object, fields map[string]any) map[string]any {
	result := make(map[string]any, len(object)+len(fields))
	for key, value := range object {
		result[key] = value
	}
	for key, value := range fields {
		result[key] = value
	}
	return result
}

func itemEvent(eventType string, item map[string]any, outputIndex int64, seq *int64) json.RawMessage {
	return mustEventJSON(map[string]any{
		"type":            eventType,
		"item":            item,
		"output_index":    outputIndex,
		"sequence_number": nextSeq(seq),
	})
}

func responseEvent(eventType string, response map[string]any, seq *int64) json.RawMessage {
	return mustEventJSON(map[string]any{
		"type":            eventType,
		"response":        response,
		"sequence_number": nextSeq(seq),
	})
}

func mustEventJSON(event any) json.RawMessage {
	raw, err := json.Marshal(event)
	if err != nil {
		panic(err)
	}
	return raw
}

func nextSeq(seq *int64) int64 {
	current := *seq
	*seq++
	return current
}

func forceNonStreamingResponses(body []byte) ([]byte, error) {
	return removeTopLevelJSONFields(body, "stream")
}
