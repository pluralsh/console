package template

import (
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

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
		if len(result[0].Message) != maxWarningLength || !strings.HasSuffix(result[0].Message, warningEllipsis) {
			t.Fatalf("expected truncated message, got length %d", len(result[0].Message))
		}
	})
}
