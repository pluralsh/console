// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package container

import (
	"fmt"
	"reflect"
	"strings"
	"testing"

	v1 "k8s.io/api/core/v1"

	"github.com/pluralsh/console/go/kubernetes-agent/api/pkg/resource/logs"
)

var log1 = logs.LogLine{
	Timestamp: "1",
	Content:   "log1",
}

var log2 = logs.LogLine{
	Timestamp: "2",
	Content:   "log2",
}

var log3 = logs.LogLine{
	Timestamp: "3",
	Content:   "log3",
}

var log4 = logs.LogLine{
	Timestamp: "4",
	Content:   "log4",
}

var log5 = logs.LogLine{
	Timestamp: "5",
	Content:   "log5",
}

var details *logs.LogDetails

func benchmarkGetLogDetails(lines int, timestamp string, b *testing.B) {
	// Generate raw logs.
	rawLogs := ""
	for i := 0; i < lines; i++ {
		rawLogs += fmt.Sprintf("%[1]d log%[1]d\n", i)
	}

	selector := &logs.Selection{
		ReferencePoint: logs.LogLineId{
			LogTimestamp: logs.LogTimestamp(timestamp),
			LineNum:      1,
		},
		OffsetFrom: -2,
		OffsetTo:   0,
	}

	var d *logs.LogDetails

	b.ResetTimer()
	for n := 0; n < b.N; n++ {
		d = ConstructLogDetails("pod-1", rawLogs, "list", selector)
	}
	b.StopTimer()

	details = d
}

func BenchmarkGetLogDetails1(b *testing.B) { benchmarkGetLogDetails(2000, "1999", b) }
func BenchmarkGetLogDetails2(b *testing.B) { benchmarkGetLogDetails(2000, "999", b) }
func BenchmarkGetLogDetails3(b *testing.B) { benchmarkGetLogDetails(2000, "99", b) }
func BenchmarkGetLogDetails4(b *testing.B) { benchmarkGetLogDetails(2000, "9", b) }

func TestGetLogs(t *testing.T) {
	cases := []struct {
		info        string
		podId       string
		rawLogs     string
		container   string
		logSelector *logs.Selection
		expected    *logs.LogDetails
	}{
		{
			"return no logs if no logs are available",
			"",
			"",
			"",
			logs.AllSelection,
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "",
					ContainerName: "",
				},
				LogLines: logs.ToLogLines(""),
			},
		},
		{
			"return all logs if selected all logs",
			"pod-1",
			"1 log1\n2 log2\n3 log3\n4 log4\n5 log5",
			"test",
			logs.AllSelection,
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "pod-1",
					ContainerName: "test",
					FromDate:      "1",
					ToDate:        "5",
				},
				LogLines: logs.LogLines{log1, log2, log3, log4, log5},
				Selection: logs.Selection{
					ReferencePoint: logs.LogLineId{
						LogTimestamp: "3",
						LineNum:      -1,
					},
					OffsetFrom:      -2,
					OffsetTo:        3,
					LogFilePosition: logs.End,
					TailLines:       logs.MaxTailLines,
				},
			},
		},
		{
			"return a slice relative to the first element",
			"pod-1",
			"1 log1\n2 log2\n3 log3\n4 log4\n5 log5",
			"test",
			&logs.Selection{
				ReferencePoint: logs.OldestLogLineId,
				OffsetFrom:     1,
				OffsetTo:       3,
			},
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "pod-1",
					ContainerName: "test",
					FromDate:      "2",
					ToDate:        "3",
					HasMore:       true,
				},
				LogLines: logs.LogLines{log2, log3},
				Selection: logs.Selection{
					ReferencePoint: logs.LogLineId{
						LogTimestamp: "3",
						LineNum:      -1,
					},
					OffsetFrom:      -1,
					OffsetTo:        1,
					LogFilePosition: logs.End,
					TailLines:       logs.DefaultTailLines,
				},
			},
		},
		{
			"return a slice relative to the last element",
			"pod-1",
			"1 log1\n2 log2\n3 log3\n4 log4\n5 log5",
			"test",
			&logs.Selection{
				ReferencePoint: logs.NewestLogLineId,
				OffsetFrom:     -3,
				OffsetTo:       -1,
			},
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "pod-1",
					ContainerName: "test",
					FromDate:      "2",
					ToDate:        "3",
					HasMore:       true,
				},
				LogLines: logs.LogLines{log2, log3},
				Selection: logs.Selection{
					ReferencePoint: logs.LogLineId{
						LogTimestamp: "3",
						LineNum:      -1,
					},
					OffsetFrom:      -1,
					OffsetTo:        1,
					LogFilePosition: logs.End,
					TailLines:       logs.DefaultTailLines,
				},
			},
		},
		{
			"return a slice relative to an arbitrary element",
			"pod-1",
			"1 log1\n2 log2\n3 log3\n4 log4\n5 log5",
			"test",
			&logs.Selection{
				ReferencePoint: logs.LogLineId{
					LogTimestamp: logs.LogTimestamp("4"),
					LineNum:      1,
				},
				OffsetFrom: -2,
				OffsetTo:   0,
			},
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "pod-1",
					ContainerName: "test",
					FromDate:      "2",
					ToDate:        "3",
					HasMore:       true,
				},
				LogLines: logs.LogLines{log2, log3},
				Selection: logs.Selection{
					ReferencePoint: logs.LogLineId{
						LogTimestamp: "3",
						LineNum:      -1,
					},
					OffsetFrom:      -1,
					OffsetTo:        1,
					LogFilePosition: logs.End,
					TailLines:       logs.DefaultTailLines,
				},
			},
		},
		{
			"return a partial page at the newest boundary",
			"pod-1",
			"1 log1\n2 log2\n3 log3\n4 log4\n5 log5",
			"test",
			&logs.Selection{
				ReferencePoint: logs.LogLineId{
					LogTimestamp: logs.LogTimestamp("4"),
					LineNum:      1,
				},
				OffsetFrom: 1,
				OffsetTo:   3,
			},
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "pod-1",
					ContainerName: "test",
					FromDate:      "5",
					ToDate:        "5",
					HasMore:       true,
				},
				LogLines: logs.LogLines{log5},
				Selection: logs.Selection{
					ReferencePoint: logs.LogLineId{
						LogTimestamp: "3",
						LineNum:      -1,
					},
					OffsetFrom:      2,
					OffsetTo:        3,
					LogFilePosition: logs.End,
					TailLines:       logs.DefaultTailLines,
				},
			},
		},
		{
			"report the oldest boundary as terminal by default",
			"pod-1",
			"1 log1\n2 log2\n3 log3\n4 log4\n5 log5",
			"test",
			&logs.Selection{
				ReferencePoint: logs.LogLineId{
					LogTimestamp: logs.LogTimestamp("2"),
					LineNum:      1,
				},
				OffsetFrom: -3,
				OffsetTo:   0,
			},
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "pod-1",
					ContainerName: "test",
					FromDate:      "1",
					ToDate:        "1",
				},
				LogLines: logs.LogLines{log1},
				Selection: logs.Selection{
					ReferencePoint: logs.LogLineId{
						LogTimestamp: "3",
						LineNum:      -1,
					},
					OffsetFrom:      -2,
					OffsetTo:        -1,
					LogFilePosition: logs.End,
					TailLines:       logs.DefaultTailLines,
				},
			},
		},
		{
			"be able to handle duplicate timestamps",
			"pod-1",
			"1 log1\n1 log2\n1 log3\n1 log4\n1 log5",
			"test",
			&logs.Selection{
				ReferencePoint: logs.LogLineId{
					LogTimestamp: logs.LogTimestamp("1"),
					LineNum:      2, // this means element with actual index 1.
				},
				OffsetFrom: 0,
				OffsetTo:   2, // request indices 1, 2
			},
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "pod-1",
					ContainerName: "test",
					FromDate:      "1",
					ToDate:        "1",
					HasMore:       true,
				},
				LogLines: logs.LogLines{logs.LogLine{
					Timestamp: "1",
					Content:   "log2",
				}, logs.LogLine{
					Timestamp: "1",
					Content:   "log3",
				}},
				Selection: logs.Selection{
					ReferencePoint: logs.LogLineId{
						LogTimestamp: "1",
						LineNum:      -3,
					},
					OffsetFrom:      -1,
					OffsetTo:        1,
					LogFilePosition: logs.End,
					TailLines:       logs.DefaultTailLines,
				},
			},
		},
		{
			"do not truncate an exact tail window",
			"pod-1",
			"1 log1\n2 log2\n3 log3\n4 log4\n5 log5\n6 log6\n7 log7\n8 log8\n9 log9\n10 log10",
			"test",
			&logs.Selection{
				ReferencePoint: logs.LogLineId{
					LogTimestamp: logs.LogTimestamp("2"),
					LineNum:      1,
				},
				OffsetFrom:      -3,
				OffsetTo:        0,
				LogFilePosition: "end",
				TailLines:       10,
			},
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "pod-1",
					ContainerName: "test",
					FromDate:      "1",
					ToDate:        "1",
				},
				LogLines: logs.LogLines{log1},
				Selection: logs.Selection{
					ReferencePoint: logs.LogLineId{
						LogTimestamp: "6",
						LineNum:      -1,
					},
					OffsetFrom:      -5,
					OffsetTo:        -4,
					LogFilePosition: logs.End,
					TailLines:       10,
				},
			},
		},
		{
			"don't try to split timestamp for error message",
			"pod-1",
			"an error message from api server",
			"test",
			logs.AllSelection,
			&logs.LogDetails{
				Info: logs.LogInfo{
					PodName:       "pod-1",
					ContainerName: "test",
					FromDate:      "0",
					ToDate:        "0",
				},
				LogLines: logs.LogLines{logs.LogLine{
					Timestamp: "0",
					Content:   "an error message from api server",
				}},
				Selection: logs.Selection{
					ReferencePoint: logs.LogLineId{
						LogTimestamp: "0",
						LineNum:      -1,
					},
					OffsetFrom:      0,
					OffsetTo:        1,
					LogFilePosition: logs.End,
					TailLines:       logs.MaxTailLines,
				},
			},
		},
	}
	for _, c := range cases {
		actual := ConstructLogDetails(c.podId, c.rawLogs, c.container, c.logSelector)
		if !reflect.DeepEqual(actual, c.expected) {
			t.Errorf("Test Case: %s.\nReceived: %#v \nExpected: %#v\n\n", c.info, actual, c.expected)
		}

	}
}

func TestConstructLogDetailsExactTailWindowIsNotTruncated(t *testing.T) {
	selection := &logs.Selection{
		ReferencePoint:  logs.NewestLogLineId,
		OffsetFrom:      -logs.MaxLogLines,
		OffsetTo:        1,
		LogFilePosition: logs.End,
		TailLines:       3,
	}
	details := ConstructLogDetails("pod-1", "1 log1\n2 log2\n3 log3", "test", selection)

	if details.Info.Truncated {
		t.Error("ConstructLogDetails() Truncated = true, want false for an exact tail window")
	}
	if details.Info.HasMore {
		t.Error("ConstructLogDetails() HasMore = true, want false at the actual log beginning")
	}
}

func TestConstructLogDetailsTailSentinelSignalsExpansion(t *testing.T) {
	selection := &logs.Selection{
		ReferencePoint:  logs.NewestLogLineId,
		OffsetFrom:      -logs.MaxLogLines,
		OffsetTo:        1,
		LogFilePosition: logs.End,
		TailLines:       3,
	}
	details := ConstructLogDetails("pod-1", "1 sentinel\n2 log2\n3 log3\n4 log4", "test", selection)

	if !details.Info.Truncated {
		t.Error("ConstructLogDetails() Truncated = false, want true when a tail sentinel is present")
	}
	if !details.Info.HasMore {
		t.Error("ConstructLogDetails() HasMore = false, want true when the tail window can expand")
	}
	if len(details.LogLines) != 3 {
		t.Errorf("ConstructLogDetails() returned %d lines, want 3", len(details.LogLines))
	}
	if details.LogLines[0].Content == "sentinel" {
		t.Error("ConstructLogDetails() returned the older tail sentinel")
	}
}

func TestConstructLogDetailsMaxTailWindowHasNoMorePages(t *testing.T) {
	var rawLogs strings.Builder
	for lineNum := 1; lineNum <= logs.MaxTailLines+1; lineNum++ {
		fmt.Fprintf(&rawLogs, "%d log%d\n", lineNum, lineNum)
	}

	selection := &logs.Selection{
		ReferencePoint:  logs.NewestLogLineId,
		OffsetFrom:      -logs.MaxLogLines,
		OffsetTo:        1,
		LogFilePosition: logs.End,
		TailLines:       logs.MaxTailLines,
	}
	details := ConstructLogDetails("pod-1", rawLogs.String(), "test", selection)

	if details.Info.HasMore {
		t.Error("ConstructLogDetails() HasMore = true, want false at the maximum tail window")
	}
	if !details.Info.Truncated {
		t.Error("ConstructLogDetails() Truncated = false, want true when the maximum tail window is full")
	}
	if len(details.LogLines) != logs.MaxTailLines {
		t.Errorf("ConstructLogDetails() returned %d lines, want %d", len(details.LogLines), logs.MaxTailLines)
	}
	if details.LogLines[0].Content == "log1" {
		t.Error("ConstructLogDetails() returned the older tail sentinel")
	}
}

func TestMapToLogOptions(t *testing.T) {
	cases := []struct {
		info        string
		container   string
		logSelector *logs.Selection
		expected    *v1.PodLogOptions
	}{
		{"Byte limit must be set, when reading the log file from the beginning",
			"test",
			&logs.Selection{
				LogFilePosition: "beginning",
			},
			&v1.PodLogOptions{
				Container:  "test",
				Timestamps: true,
				LimitBytes: &byteReadLimit,
			},
		},
		{"One extra line must be read from the end to detect truncation",
			"test",
			&logs.Selection{
				LogFilePosition: "end",
			},
			&v1.PodLogOptions{
				Container:  "test",
				Timestamps: true,
				TailLines:  int64Pointer(logs.DefaultTailLines + 1),
			},
		},
		{"One extra requested line must be read from the end to detect truncation",
			"test",
			&logs.Selection{
				LogFilePosition: logs.End,
				TailLines:       1000,
			},
			&v1.PodLogOptions{
				Container:  "test",
				Timestamps: true,
				TailLines:  int64Pointer(1001),
			},
		},
	}
	for _, c := range cases {
		actual := mapToLogOptions(c.container, c.logSelector, false)
		if !reflect.DeepEqual(actual, c.expected) {
			t.Errorf("Test Case: %s.\nReceived: %#v \nExpected: %#v\n\n", c.info, actual, c.expected)
		}

	}
}

func int64Pointer(value int) *int64 {
	result := int64(value)
	return &result
}
