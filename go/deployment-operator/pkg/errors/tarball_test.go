package errors

import (
	"fmt"
	"testing"
)

func TestIsWarning(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{name: "nil", err: nil, want: false},
		{name: "not a warning", err: fmt.Errorf("not a warning"), want: false},
		{name: "warning", err: NewDigestMismatchError("expected", "actual"), want: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := IsWarning(test.err)
			if got != test.want {
				t.Errorf("IsWarning(%v) = %v, want %v", test.err, got, test.want)
			}
		})
	}
}
