package prebake

import (
	"testing"
)

func TestValidatePath(t *testing.T) {
	t.Parallel()
	tests := []struct {
		path    string
		wantErr bool
	}{
		{path: "console", wantErr: false},
		{path: "nested/console", wantErr: false},
		{path: "", wantErr: true},
		{path: "manifest.json", wantErr: true},
		{path: "/abs", wantErr: true},
		{path: "..", wantErr: true},
		{path: "../escape", wantErr: true},
		{path: "foo/../bar", wantErr: false}, // Clean makes this "bar"
		{path: ".", wantErr: true},
	}
	for _, tt := range tests {
		err := validatePath(tt.path)
		if tt.wantErr && err == nil {
			t.Errorf("validatePath(%q) = nil, want error", tt.path)
		}
		if !tt.wantErr && err != nil {
			t.Errorf("validatePath(%q) = %v, want nil", tt.path, err)
		}
	}
}

func TestParseChown(t *testing.T) {
	t.Parallel()
	uid, gid, err := parseChown("65532:65532")
	if err != nil {
		t.Fatal(err)
	}
	if uid != 65532 || gid != 65532 {
		t.Fatalf("got %d:%d", uid, gid)
	}
	uid, gid, err = parseChown("65532")
	if err != nil {
		t.Fatal(err)
	}
	if uid != 65532 || gid != 65532 {
		t.Fatalf("got %d:%d", uid, gid)
	}
	if _, _, err := parseChown(""); err == nil {
		t.Fatal("expected error")
	}
	if _, _, err := parseChown("a:b"); err == nil {
		t.Fatal("expected error")
	}
}
