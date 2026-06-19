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

	shell, err := responseShell(response)
	if err != nil {
		return nil, err
	}

	events = append(events, mustEventJSON(responses.ResponseCreatedEvent{
		Response:       shell,
		SequenceNumber: nextSeq(&seq),
		Type:           constant.ResponseCreated("response.created"),
	}))
	events = append(events, mustEventJSON(responses.ResponseInProgressEvent{
		Response:       shell,
		SequenceNumber: nextSeq(&seq),
		Type:           constant.ResponseInProgress("response.in_progress"),
	}))

	for outputIndex, item := range response.Output {
		itemEvents, err := streamEventsForOutputItem(item, int64(outputIndex), &seq)
		if err != nil {
			return nil, err
		}
		events = append(events, itemEvents...)
	}

	events = append(events, mustEventJSON(responses.ResponseCompletedEvent{
		Response:       response,
		SequenceNumber: nextSeq(&seq),
		Type:           constant.ResponseCompleted("response.completed"),
	}))

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

	inProgress, err := messageWithStatus(message, responses.ResponseOutputMessageStatusInProgress, true)
	if err != nil {
		return nil, err
	}

	events = append(events, mustEventJSON(responses.ResponseOutputItemAddedEvent{
		Item:           inProgress,
		OutputIndex:    outputIndex,
		SequenceNumber: nextSeq(seq),
		Type:           constant.ResponseOutputItemAdded("response.output_item.added"),
	}))

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

	completedItem, err := messageAsOutputItem(message)
	if err != nil {
		return nil, err
	}

	events = append(events, mustEventJSON(responses.ResponseOutputItemDoneEvent{
		Item:           completedItem,
		OutputIndex:    outputIndex,
		SequenceNumber: nextSeq(seq),
		Type:           constant.ResponseOutputItemDone("response.output_item.done"),
	}))

	return events, nil
}

func streamEventsForFunctionCall(call responses.ResponseFunctionToolCall, outputIndex int64, seq *int64) ([]json.RawMessage, error) {
	var events []json.RawMessage

	inProgress, err := functionCallWithStatus(call, "in_progress")
	if err != nil {
		return nil, err
	}

	events = append(events, mustEventJSON(responses.ResponseOutputItemAddedEvent{
		Item:           inProgress,
		OutputIndex:    outputIndex,
		SequenceNumber: nextSeq(seq),
		Type:           constant.ResponseOutputItemAdded("response.output_item.added"),
	}))
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

	completed, err := functionCallWithStatus(call, "completed")
	if err != nil {
		return nil, err
	}

	events = append(events, mustEventJSON(responses.ResponseOutputItemDoneEvent{
		Item:           completed,
		OutputIndex:    outputIndex,
		SequenceNumber: nextSeq(seq),
		Type:           constant.ResponseOutputItemDone("response.output_item.done"),
	}))

	return events, nil
}

func streamEventsForGenericItem(item responses.ResponseOutputItemUnion, outputIndex int64, seq *int64) ([]json.RawMessage, error) {
	inProgress, err := outputItemWithStatus(item, "in_progress")
	if err != nil {
		return nil, err
	}
	completed, err := outputItemWithStatus(item, "completed")
	if err != nil {
		return nil, err
	}

	return []json.RawMessage{
		mustEventJSON(responses.ResponseOutputItemAddedEvent{
			Item:           inProgress,
			OutputIndex:    outputIndex,
			SequenceNumber: nextSeq(seq),
			Type:           constant.ResponseOutputItemAdded("response.output_item.added"),
		}),
		mustEventJSON(responses.ResponseOutputItemDoneEvent{
			Item:           completed,
			OutputIndex:    outputIndex,
			SequenceNumber: nextSeq(seq),
			Type:           constant.ResponseOutputItemDone("response.output_item.done"),
		}),
	}, nil
}

func responseShell(response responses.Response) (responses.Response, error) {
	raw, err := json.Marshal(response)
	if err != nil {
		return responses.Response{}, fmt.Errorf("marshal response shell: %w", err)
	}

	var shell responses.Response
	if err := json.Unmarshal(raw, &shell); err != nil {
		return responses.Response{}, fmt.Errorf("unmarshal response shell: %w", err)
	}

	shell.Output = nil
	shell.Status = responses.ResponseStatusInProgress
	return shell, nil
}

func messageWithStatus(message responses.ResponseOutputMessage, status responses.ResponseOutputMessageStatus, clearContent bool) (responses.ResponseOutputItemUnion, error) {
	raw, err := json.Marshal(message)
	if err != nil {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("marshal message: %w", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("unmarshal message: %w", err)
	}

	payload["status"] = string(status)
	if clearContent {
		payload["content"] = []any{}
	}

	return outputItemFromMap(payload)
}

func functionCallWithStatus(call responses.ResponseFunctionToolCall, status string) (responses.ResponseOutputItemUnion, error) {
	raw, err := json.Marshal(call)
	if err != nil {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("marshal function call: %w", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("unmarshal function call: %w", err)
	}

	payload["status"] = status
	return outputItemFromMap(payload)
}

func outputItemWithStatus(item responses.ResponseOutputItemUnion, status string) (responses.ResponseOutputItemUnion, error) {
	raw := item.RawJSON()
	if raw == "" {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("output item has no raw JSON")
	}

	var payload map[string]any
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("unmarshal output item: %w", err)
	}

	payload["status"] = status
	return outputItemFromMap(payload)
}

func outputItemFromMap(payload map[string]any) (responses.ResponseOutputItemUnion, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("marshal output item: %w", err)
	}

	var item responses.ResponseOutputItemUnion
	if err := json.Unmarshal(raw, &item); err != nil {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("unmarshal output item union: %w", err)
	}

	return item, nil
}

func messageAsOutputItem(message responses.ResponseOutputMessage) (responses.ResponseOutputItemUnion, error) {
	raw, err := json.Marshal(message)
	if err != nil {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("marshal message: %w", err)
	}

	var item responses.ResponseOutputItemUnion
	if err := json.Unmarshal(raw, &item); err != nil {
		return responses.ResponseOutputItemUnion{}, fmt.Errorf("unmarshal message union: %w", err)
	}

	return item, nil
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
