package fileutils

import (
	"log"
	"os"
	"path/filepath"
	"strings"
)

var helmTemplateFileTypes = map[string]struct{}{
	".yaml": {},
	".yml":  {},
	".tpl":  {},
}

func ListAllFiles(dir string, recursive bool) []string {
	filenames := []string{}

	files, err := os.ReadDir(dir)
	if err != nil {
		panic(err)
	}

	for _, file := range files {
		_, fileTypeMatch := helmTemplateFileTypes[filepath.Ext(file.Name())]
		if !file.IsDir() && fileTypeMatch {
			filenames = append(filenames, filepath.Join(dir, file.Name()))
		} else if recursive && file.IsDir() {
			filenames = append(filenames, ListAllFiles(filepath.Join(dir, file.Name()), recursive)...)
		}
	}

	return filenames
}

func GetFileContents(filename string) []string {
	data, err := os.ReadFile(filename)
	if err != nil {
		log.Fatal("Error reading file: ", filename)
		panic(err)
	}
	return strings.Split(string(data), "\n")
}

func WriteOutput(filename string, data string) {
	err := os.WriteFile(filename, []byte(data), 0644)
	if err != nil {
		log.Fatal("Error writing file: ", filename)
		panic(err)
	}
}
