package exec

import (
	"bufio"
	"strings"

	"github.com/pluralsh/console/go/polly/algorithms"
)

type keywordDetector struct {
	keywords []keyword
}

type keyword struct {
	content    string
	ignoreCase bool
}

func (in keyword) PartOf(s string) bool {
	if !in.ignoreCase {
		return strings.Contains(s, in.content)
	}

	return strings.Contains(
		strings.ToLower(s),
		strings.ToLower(in.content),
	)
}

// Detect implements [OutputAnalyzerHeuristic] interface.
// TODO: we can spread actual message analysis into multiple routines to speed up the process.
func (in *keywordDetector) Detect(input *bufio.Scanner) Errors {
	line := 0
	errors := make([]Error, 0)
	for input.Scan() {
		if !in.hasError(input.Text()) {
			continue
		}

		errors = append(errors, Error{
			line:    line,
			message: input.Text(),
		})
	}

	return errors
}

func (in *keywordDetector) hasError(message string) bool {
	return algorithms.Index(in.keywords, func(k keyword) bool {
		return k.PartOf(message)
	}) >= 0
}

func NewKeywordDetector() OutputAnalyzerHeuristic {
	return &keywordDetector{
		keywords: []keyword{
			{"error message: http remote state already locked", true},
			{"error acquiring the state lock", true},
			{"Error:", false},
		},
	}
}
