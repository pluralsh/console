package insights

import "strings"

const maxTokens = 8

// tokenize lowercases s and splits it on '-', '_' and '.'.
func tokenize(s string) []string {
	tokens := strings.FieldsFunc(strings.ToLower(s), func(r rune) bool {
		return r == '-' || r == '_' || r == '.'
	})
	if len(tokens) > maxTokens {
		tokens = tokens[:maxTokens]
	}
	return tokens
}

// longestRun returns the longest key of keys that equals a contiguous run of the tokens of s joined
// without separators. Subsequences and near misses never match: "concert-manager" contains the
// letters of "certmanager" in order but its runs are "concert", "manager" and "concertmanager".
func longestRun[V any](s string, keys map[string]V) (key string, value V, ok bool) {
	tokens := tokenize(s)
	for i := range tokens {
		var run strings.Builder
		for j := i; j < len(tokens); j++ {
			run.WriteString(tokens[j])
			if v, found := keys[run.String()]; found && run.Len() > len(key) {
				key, value, ok = run.String(), v, true
			}
		}
	}
	return key, value, ok
}
