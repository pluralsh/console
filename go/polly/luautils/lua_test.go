package luautils_test

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/pluralsh/polly/luautils"
	lua "github.com/yuin/gopher-lua"
)

// helper that runs Lua code and returns output or error string
func runLua(L *lua.LState, code string) (string, error) {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w
	if err := L.DoString(code); err != nil {
		return "", err
	}
	if err := w.Close(); err != nil {
		return "", err
	}
	os.Stdout = old
	var buf bytes.Buffer
	if _, err := buf.ReadFrom(r); err != nil {
		return "", err
	}

	return buf.String(), nil
}

func TestBaseLibPrint(t *testing.T) {
	L := luautils.NewLuaState("")

	out, err := runLua(L, `print("hello world")`)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if !strings.Contains(out, "hello world") {
		t.Errorf("expected 'hello world' in output, got: %q", out)
	}
}

func TestStringLibrary(t *testing.T) {
	L := luautils.NewLuaState("")

	out, err := runLua(L, `print(string.upper("abc"))`)
	if err != nil {
		t.Fatalf("lua error: %v", err)
	}
	if !strings.Contains(out, "ABC") {
		t.Errorf("expected string.upper to work, got: %q", out)
	}
}

func TestTableLibrary(t *testing.T) {
	L := luautils.NewLuaState("")

	code := `
		local t = {3,1,2}
		table.sort(t)
		print(table.concat(t, ","))
	`
	out, err := runLua(L, code)
	if err != nil {
		t.Fatalf("lua error: %v", err)
	}
	if !strings.Contains(out, "1,2,3") {
		t.Errorf("expected sorted table output, got: %q", out)
	}
}

func TestMathLibrary(t *testing.T) {
	L := luautils.NewLuaState("")

	out, err := runLua(L, `print(math.sqrt(9))`)
	if err != nil {
		t.Fatalf("lua error: %v", err)
	}
	if !strings.Contains(out, "3") {
		t.Errorf("expected sqrt(9) = 3, got: %q", out)
	}
}
