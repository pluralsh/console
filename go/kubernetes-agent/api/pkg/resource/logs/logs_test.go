package logs

import (
	"reflect"
	"testing"
)

func TestLogLinesSelectLogsReturnsPartialTerminalPages(t *testing.T) {
	logLines := ToLogLines("1 log1\n2 log2\n3 log3\n4 log4\n5 log5")

	tests := []struct {
		name         string
		selection    Selection
		expected     LogLines
		expectedLast bool
	}{
		{
			name: "fewer than requested end page",
			selection: Selection{
				ReferencePoint:  NewestLogLineId,
				OffsetFrom:      -5,
				OffsetTo:        1,
				LogFilePosition: End,
			},
			expected: LogLines{
				{Timestamp: "1", Content: "log1"},
				{Timestamp: "2", Content: "log2"},
				{Timestamp: "3", Content: "log3"},
				{Timestamp: "4", Content: "log4"},
				{Timestamp: "5", Content: "log5"},
			},
			expectedLast: true,
		},
		{
			name: "exact end boundary",
			selection: Selection{
				ReferencePoint:  NewestLogLineId,
				OffsetFrom:      -4,
				OffsetTo:        1,
				LogFilePosition: End,
			},
			expected: LogLines{
				{Timestamp: "1", Content: "log1"},
				{Timestamp: "2", Content: "log2"},
				{Timestamp: "3", Content: "log3"},
				{Timestamp: "4", Content: "log4"},
				{Timestamp: "5", Content: "log5"},
			},
			expectedLast: true,
		},
		{
			name: "omitted direction defaults to an end remainder",
			selection: Selection{
				ReferencePoint: LogLineId{LogTimestamp: "2", LineNum: 1},
				OffsetFrom:     -3,
				OffsetTo:       0,
			},
			expected:     LogLines{{Timestamp: "1", Content: "log1"}},
			expectedLast: true,
		},
		{
			name: "beginning remainder does not overlap prior page",
			selection: Selection{
				ReferencePoint:  LogLineId{LogTimestamp: "4", LineNum: 1},
				OffsetFrom:      0,
				OffsetTo:        3,
				LogFilePosition: Beginning,
			},
			expected:     LogLines{{Timestamp: "4", Content: "log4"}, {Timestamp: "5", Content: "log5"}},
			expectedLast: true,
		},
		{
			name: "exact beginning boundary",
			selection: Selection{
				ReferencePoint:  LogLineId{LogTimestamp: "3", LineNum: 1},
				OffsetFrom:      0,
				OffsetTo:        3,
				LogFilePosition: Beginning,
			},
			expected: LogLines{
				{Timestamp: "3", Content: "log3"},
				{Timestamp: "4", Content: "log4"},
				{Timestamp: "5", Content: "log5"},
			},
			expectedLast: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			selected, _, _, _, lastPage := logLines.SelectLogs(&tt.selection)

			if !reflect.DeepEqual(selected, tt.expected) {
				t.Errorf("SelectLogs() = %#v, want %#v", selected, tt.expected)
			}
			if lastPage != tt.expectedLast {
				t.Errorf("SelectLogs() lastPage = %t, want %t", lastPage, tt.expectedLast)
			}
		})
	}
}

func TestLogLinesSelectLogsNormalizesInvalidLogFilePosition(t *testing.T) {
	logLines := ToLogLines("1 log1\n2 log2")

	_, _, _, selection, lastPage := logLines.SelectLogs(&Selection{
		ReferencePoint:  NewestLogLineId,
		OffsetFrom:      -2,
		OffsetTo:        1,
		LogFilePosition: "invalid",
	})

	if !lastPage {
		t.Error("SelectLogs() lastPage = false, want true")
	}
	if selection.LogFilePosition != End {
		t.Errorf("SelectLogs() LogFilePosition = %q, want %q", selection.LogFilePosition, End)
	}
	if selection.TailLines != DefaultTailLines {
		t.Errorf("SelectLogs() TailLines = %d, want %d", selection.TailLines, DefaultTailLines)
	}
}

func TestNormalizeTailLines(t *testing.T) {
	tests := []struct {
		name      string
		tailLines int
		expected  int
	}{
		{name: "zero uses default", tailLines: 0, expected: DefaultTailLines},
		{name: "negative uses default", tailLines: -1, expected: DefaultTailLines},
		{name: "requested value is preserved", tailLines: 1000, expected: 1000},
		{name: "maximum is preserved", tailLines: MaxTailLines, expected: MaxTailLines},
		{name: "value above maximum is capped", tailLines: MaxTailLines + 1, expected: MaxTailLines},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NormalizeTailLines(tt.tailLines); got != tt.expected {
				t.Errorf("NormalizeTailLines(%d) = %d, want %d", tt.tailLines, got, tt.expected)
			}
		})
	}
}

func TestLogLinesSelectLogsExpandsEndWindowWithDuplicateTimestamps(t *testing.T) {
	firstWindow := LogLines{
		{Timestamp: "1", Content: "log5"},
		{Timestamp: "1", Content: "log6"},
		{Timestamp: "1", Content: "log7"},
	}
	_, _, _, firstSelection, _ := firstWindow.SelectLogs(&Selection{
		ReferencePoint:  NewestLogLineId,
		OffsetFrom:      -3,
		OffsetTo:        1,
		LogFilePosition: End,
		TailLines:       3,
	})

	pageSize := firstSelection.OffsetTo - firstSelection.OffsetFrom
	nextWindow := LogLines{
		{Timestamp: "1", Content: "log2"},
		{Timestamp: "1", Content: "log3"},
		{Timestamp: "1", Content: "log4"},
		{Timestamp: "1", Content: "log5"},
		{Timestamp: "1", Content: "log6"},
		{Timestamp: "1", Content: "log7"},
	}
	nextPage, _, _, _, _ := nextWindow.SelectLogs(&Selection{
		ReferencePoint:  firstSelection.ReferencePoint,
		OffsetFrom:      firstSelection.OffsetFrom - pageSize,
		OffsetTo:        firstSelection.OffsetFrom,
		LogFilePosition: End,
		TailLines:       6,
	})

	expected := LogLines{
		{Timestamp: "1", Content: "log2"},
		{Timestamp: "1", Content: "log3"},
		{Timestamp: "1", Content: "log4"},
	}
	if !reflect.DeepEqual(nextPage, expected) {
		t.Errorf("expanded tail page = %#v, want %#v", nextPage, expected)
	}
}
