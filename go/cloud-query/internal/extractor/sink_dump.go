package extractor

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// dumpSink is a Sink that writes the output to a file in YAML format.
// Each output is written to a separate file named after the output type.
// Can be used for debugging or storing results in a human-readable format.
type dumpSink struct {
	dir string
}

func (in *dumpSink) Send(output *cloudquery.ExtractOutput) error {
	file, err := os.OpenFile(filepath.Join(in.dir, fmt.Sprintf("%s.yaml", output.Type)), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open file for writing: %w", err)
	}
	defer file.Close()

	var jsonData interface{}
	err = json.Unmarshal([]byte(output.Result), &jsonData)
	if err != nil {
		return fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	bytes, err := yaml.Marshal(jsonData)
	if err != nil {
		return fmt.Errorf("failed to marshal output to YAML: %w", err)
	}

	_, _ = file.WriteString(fmt.Sprintf("# Table: %s\n# ID: %s\n# Links: %s\n", output.Type, output.Id, output.Links))
	_, _ = file.Write(bytes)
	_, _ = file.WriteString("\n---\n")
	return err
}

// NewDumpSink creates a new dumpSink that writes to the specified directory.
func NewDumpSink(dir string) (Sink, error) {
	if dir == "" {
		return nil, fmt.Errorf("file path cannot be empty")
	}
	return &dumpSink{dir: dir}, nil
}
