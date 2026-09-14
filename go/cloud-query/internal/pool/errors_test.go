package pool

import (
	"database/sql"
	"fmt"
	"testing"

	"github.com/lib/pq"
)

func TestIsStaleConnection(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "nil",
			err:  nil,
			want: false,
		},
		{
			name: "unrelated",
			err:  fmt.Errorf("syntax error"),
			want: false,
		},
		{
			name: "conn done",
			err:  sql.ErrConnDone,
			want: true,
		},
		{
			name: "wrapped conn done",
			err:  fmt.Errorf("query: %w", sql.ErrConnDone),
			want: true,
		},
		{
			name: "missing role",
			err:  &pq.Error{Code: pqInvalidAuthorization, Message: `role "1f1a620bae916db5b5be9cc5e3c1f38a" does not exist`},
			want: true,
		},
		{
			name: "wrapped missing role",
			err:  fmt.Errorf("failed to execute schema query 'ec2': %w", &pq.Error{Code: pqInvalidAuthorization, Message: `role "abc" does not exist`}),
			want: true,
		},
		{
			name: "connection exception",
			err:  &pq.Error{Code: "08006", Message: "connection failure"},
			want: true,
		},
		{
			name: "string fallback",
			err:  fmt.Errorf(`pq: role "1f1a620bae916db5b5be9cc5e3c1f38a" does not exist (28000)`),
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := IsStaleConnection(tt.err); got != tt.want {
				t.Fatalf("IsStaleConnection() = %v, want %v", got, tt.want)
			}
		})
	}
}
