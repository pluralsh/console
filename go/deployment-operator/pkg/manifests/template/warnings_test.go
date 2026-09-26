package template

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

func TestHelmValuesWarnsOnMissingScriptValuesFile(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "present.yaml"), []byte("key: value\n"), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	svc := &console.ServiceDeploymentForAgent{
		Helm: &console.ServiceDeploymentForAgent_Helm{
			ValuesFiles: []*string{lo.ToPtr("present.yaml"), lo.ToPtr("missing.yaml")},
		},
	}

	h := &helm{dir: dir}
	values, err := h.values(svc, []*string{lo.ToPtr("generated.yaml")})
	if err != nil {
		t.Fatalf("values: %v", err)
	}
	if values["key"] != "value" {
		t.Fatalf("unexpected values: %#v", values)
	}

	// Only the file requested by the script is reported, missing files from the service spec stay optional.
	warnings := h.Warnings()
	if len(warnings) != 1 {
		t.Fatalf("unexpected warnings: %#v", warnings)
	}
	if warnings[0].Source != helmWarningSource || !strings.Contains(warnings[0].Message, "generated.yaml") || !lo.FromPtr(warnings[0].Warning) {
		t.Fatalf("unexpected warning: %#v", warnings[0])
	}
}

func TestHelmValuesDoesNotWarnOnMissingImplicitFiles(t *testing.T) {
	h := &helm{dir: t.TempDir()}
	if _, err := h.values(&console.ServiceDeploymentForAgent{Helm: &console.ServiceDeploymentForAgent_Helm{}}, nil); err != nil {
		t.Fatalf("values: %v", err)
	}
	if len(h.Warnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", h.Warnings())
	}
}

func TestHelmValuesWarnsOnInvalidStaticValues(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "values.yaml.static"), []byte("key: [unclosed\n"), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	h := &helm{dir: dir}
	svc := &console.ServiceDeploymentForAgent{
		Helm: &console.ServiceDeploymentForAgent_Helm{Values: lo.ToPtr("key: value\n")},
	}
	values, err := h.values(svc, nil)
	if err != nil {
		t.Fatalf("values: %v", err)
	}
	if values["key"] != "value" {
		t.Fatalf("unexpected values: %#v", values)
	}

	warnings := h.Warnings()
	if len(warnings) != 1 || warnings[0].Source != helmWarningSource || !strings.Contains(warnings[0].Message, "values.yaml.static") {
		t.Fatalf("unexpected warnings: %#v", warnings)
	}
	if strings.Contains(warnings[0].Message, dir) {
		t.Fatalf("warning should not contain the temporary manifest directory: %q", warnings[0].Message)
	}
}

func TestNormalizeWarnings(t *testing.T) {
	warning := func(source, message string) console.ServiceErrorAttributes {
		return console.ServiceErrorAttributes{Source: source, Message: message, Warning: lo.ToPtr(true)}
	}

	t.Run("trims, drops empty and duplicate warnings, and preserves order", func(t *testing.T) {
		result := normalizeWarnings([]console.ServiceErrorAttributes{
			warning("lua", "  second  "),
			warning("lua", ""),
			warning("lua", "   "),
			warning("python", "first"),
			warning("lua", "second"),
			warning("python", "second"),
		})

		expected := []string{"lua:second", "python:first", "python:second"}
		if len(result) != len(expected) {
			t.Fatalf("unexpected warnings: %#v", result)
		}
		for i, e := range expected {
			if result[i].Source+":"+result[i].Message != e || !lo.FromPtr(result[i].Warning) {
				t.Fatalf("unexpected warning %d: %#v", i, result[i])
			}
		}
	})

	t.Run("caps count and message length", func(t *testing.T) {
		var warnings []console.ServiceErrorAttributes
		for i := range maxWarnings + 5 {
			warnings = append(warnings, warning("lua", strings.Repeat("x", i+1)))
		}
		warnings[0].Message = strings.Repeat("y", maxWarningLength*2)

		result := normalizeWarnings(warnings)
		if len(result) != maxWarnings {
			t.Fatalf("expected %d warnings, got %d", maxWarnings, len(result))
		}
		if len(result[0].Message) != maxWarningLength+len("...") {
			t.Fatalf("expected truncated message, got length %d", len(result[0].Message))
		}
	})
}
