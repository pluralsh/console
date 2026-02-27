package luautils

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	lua "github.com/yuin/gopher-lua"
)

// RegisterFSModule registers the fs module functions
func RegisterFSModule(processor *Processor, L *lua.LState) {
	mod := L.RegisterModule("fs", map[string]lua.LGFunction{
		"read": processor.fsRead,
		"walk": processor.fsWalk,
	})
	L.Push(mod)
}

func (p *Processor) fsRead(L *lua.LState) int {
	filePath := L.CheckString(1)

	// Validate and clean the path
	cleanPath, err := p.validatePath(filePath)
	if err != nil {
		L.Push(lua.LNil)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	content, err := os.ReadFile(cleanPath)
	if err != nil {
		L.Push(lua.LNil)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	L.Push(lua.LString(string(content)))
	return 1
}

func (p *Processor) fsWalk(L *lua.LState) int {
	dir := L.CheckString(1)

	// Optional setting: ignore dotfiles
	ignoreDotfiles := false
	if L.GetTop() >= 2 {
		ignoreDotfiles = L.CheckBool(2)
	}

	// Validate and clean the path
	cleanPath, err := p.validatePath(dir)
	if err != nil {
		L.Push(lua.LNil)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	var files []string
	err = filepath.Walk(cleanPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Ignore dotfile directories and their contents
		if info.IsDir() && ignoreDotfiles && strings.HasPrefix(info.Name(), ".") {
			return filepath.SkipDir // Skip this directory and its children
		}

		// Skip non-files (directories are skipped above)
		if info.IsDir() {
			return nil // Continue walking
		}

		// Convert absolute path to relative path from base directory
		relPath, err := filepath.Rel(p.BasePath, path)
		if err != nil {
			return err
		}

		// Skip dotfiles if requested
		if ignoreDotfiles && strings.HasPrefix(filepath.Base(relPath), ".") {
			return nil // Skip dotfile
		}

		files = append(files, relPath)
		return nil
	})

	if err != nil {
		L.Push(lua.LNil)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	// Convert files slice to Lua table
	filesTable := L.NewTable()
	for i, file := range files {
		L.RawSetInt(filesTable, i+1, lua.LString(file))
	}

	L.Push(filesTable)
	return 1
}

func (p *Processor) validatePath(path string) (string, error) {
	if p.BasePath == "" {
		return "", fmt.Errorf("base path not set")
	}
	// Clean the path and resolve relative components
	cleanPath := filepath.Clean(filepath.Join(p.BasePath, path))

	// Ensure the path is within the base directory
	if !strings.HasPrefix(cleanPath, p.BasePath) {
		return "", fmt.Errorf("access denied: path outside base directory")
	}

	return cleanPath, nil
}
