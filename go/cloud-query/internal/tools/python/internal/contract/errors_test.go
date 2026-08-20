package contract

import (
	"errors"
	"strings"
	"testing"
)

func TestErrorKeepsCauseAndBoundsDisclosure(t *testing.T) {
	cause := errors.New(strings.Repeat("x", MaxDetailBytes+1))
	err := Invalid(strings.Repeat("summary ", 100), cause)
	if CodeOf(err) != InvalidArgument || len([]rune(PublicMessage(err))) > 512 {
		t.Fatalf("unexpected classified error: %q", PublicMessage(err))
	}
	if !errors.Is(err, cause) || !strings.HasSuffix(Detail(err), detailTruncationMarker) {
		t.Fatal("cause or detail truncation was lost")
	}
}
