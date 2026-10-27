package python

import (
	"context"
	"errors"
	"fmt"
	iofs "io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
	"syscall"
	"unicode/utf8"

	monty "github.com/ewhauser/gomonty"
)

const (
	fsName   = "fs"
	fsTypeID = 1
)

// fsModule backs the fs global, mirroring the Lua fs module. Every path is
// resolved through an os.Root opened on the service directory, so neither ".."
// components, absolute paths, nor symlinks can reach outside of it.
type fsModule struct {
	dir  string
	root *os.Root
}

func newFSModule(dir string) *fsModule {
	return &fsModule{dir: dir}
}

// fsValue is the sandbox value bound to the fs global. Monty dispatches
// fs.read(...) and fs.walk(...) to the host as method calls on it.
func fsValue() monty.Value {
	return monty.DataclassValue(monty.Dataclass{
		Name:       fsName,
		TypeID:     fsTypeID,
		FieldNames: []string{},
		Attrs:      monty.Dict{},
		Frozen:     true,
	})
}

func isFSValue(value monty.Value) bool {
	self, ok := value.Dataclass()
	return ok && self.Name == fsName && self.TypeID == fsTypeID
}

func (f *fsModule) method(name string) (monty.ExternalFunction, bool) {
	switch name {
	case "read":
		return f.read, true
	case "walk":
		return f.walk, true
	default:
		return nil, false
	}
}

func (f *fsModule) Close() {
	if f.root != nil {
		_ = f.root.Close()
		f.root = nil
	}
}

func (f *fsModule) open() (*os.Root, error) {
	if f.root != nil {
		return f.root, nil
	}
	if f.dir == "" {
		return nil, errors.New("filesystem access is not available")
	}
	root, err := os.OpenRoot(f.dir)
	if err != nil {
		return nil, err
	}
	f.root = root
	return root, nil
}

// read implements fs.read(path) -> str. The path is relative to the service root.
func (f *fsModule) read(_ context.Context, call monty.Call) (monty.Result, error) {
	args := call.Args[1:]
	if len(args) != 1 || len(call.Kwargs) != 0 {
		return raise("TypeError", "fs.read() takes exactly 1 argument")
	}
	name, ok := pathArg(args[0])
	if !ok {
		return raise("TypeError", "fs.read() argument must be a string")
	}

	root, err := f.open()
	if err != nil {
		return fsError(err)
	}
	content, err := root.ReadFile(name)
	if err != nil {
		return fsError(err)
	}
	if !utf8.Valid(content) {
		return raise("UnicodeDecodeError", fmt.Sprintf("fs.read(): %s is not valid UTF-8", name))
	}
	return monty.Return(monty.String(string(content))), nil
}

// walk implements fs.walk(dir, ignore_dotfiles=False) -> list[str]. It returns
// the files under dir, recursively and in lexical order, as paths relative to
// the service root. With ignore_dotfiles, files and directories whose names
// start with "." are skipped, along with everything under them.
func (f *fsModule) walk(_ context.Context, call monty.Call) (monty.Result, error) {
	args := call.Args[1:]
	for _, pair := range call.Kwargs {
		if key, _ := pair.Key.Raw().(string); key != "ignore_dotfiles" {
			return raise("TypeError", fmt.Sprintf("fs.walk() got an unexpected keyword argument %q", key))
		}
		args = append(args, pair.Value)
	}
	if len(args) < 1 || len(args) > 2 {
		return raise("TypeError", "fs.walk() takes 1 or 2 arguments")
	}
	dir, ok := pathArg(args[0])
	if !ok {
		return raise("TypeError", "fs.walk() dir must be a string")
	}
	ignoreDotfiles := false
	if len(args) == 2 {
		if ignoreDotfiles, ok = args[1].Raw().(bool); !ok {
			return raise("TypeError", "fs.walk() ignore_dotfiles must be a bool")
		}
	}

	root, err := f.open()
	if err != nil {
		return fsError(err)
	}
	start := path.Clean(filepath.ToSlash(dir))
	info, err := root.Stat(start)
	if err != nil {
		return fsError(err)
	}
	if !info.IsDir() {
		return monty.Return(goToValue([]string{start})), nil
	}

	sub, err := root.OpenRoot(start)
	if err != nil {
		return fsError(err)
	}
	defer sub.Close()

	files := make([]string, 0)
	err = iofs.WalkDir(sub.FS(), ".", func(name string, entry iofs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if name == "." {
			return nil
		}
		if ignoreDotfiles && strings.HasPrefix(entry.Name(), ".") {
			if entry.IsDir() {
				return iofs.SkipDir
			}
			return nil
		}
		if !entry.IsDir() {
			files = append(files, path.Join(start, name))
		}
		return nil
	})
	if err != nil {
		return fsError(err)
	}
	return monty.Return(goToValue(files)), nil
}

func pathArg(value monty.Value) (string, bool) {
	switch raw := value.Raw().(type) {
	case string:
		return raw, true
	case monty.Path:
		return string(raw), true
	default:
		return "", false
	}
}

func fsError(err error) (monty.Result, error) {
	switch {
	case errors.Is(err, iofs.ErrNotExist):
		return raise("FileNotFoundError", err.Error())
	case errors.Is(err, syscall.ENOTDIR):
		return raise("NotADirectoryError", err.Error())
	case errors.Is(err, syscall.EISDIR):
		return raise("IsADirectoryError", err.Error())
	default:
		return raise("OSError", err.Error())
	}
}
