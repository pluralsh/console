package v1

import (
	"regexp"
	"strconv"
)

var versionRegex = regexp.MustCompile(`^v([0-9]+)(alpha|beta)?([0-9]+)?$`)

type NormalizedVersion struct {
	Major     int
	Stage     string // "", "beta", "alpha"
	SuffixNum int
	Raw       string
}

func ParseVersion(raw string) (*NormalizedVersion, bool) {
	matches := versionRegex.FindStringSubmatch(raw)
	if matches == nil {
		return nil, false
	}

	major, _ := strconv.Atoi(matches[1])
	stage := matches[2]
	suffixNum := 0
	if matches[3] != "" {
		suffixNum, _ = strconv.Atoi(matches[3])
	}

	return &NormalizedVersion{
		Major:     major,
		Stage:     stage,
		SuffixNum: suffixNum,
		Raw:       raw,
	}, true
}

// CompareVersions sorting: v3 > v2 > v2beta > v2alpha > v2beta1 > ...
func CompareVersions(a, b NormalizedVersion) bool {
	if a.Major != b.Major {
		return a.Major > b.Major
	}
	stageRank := func(stage string) int {
		switch stage {
		case "":
			return 3 // stable
		case "beta":
			return 2
		case "alpha":
			return 1
		default:
			return 0
		}
	}
	if stageRank(a.Stage) != stageRank(b.Stage) {
		return stageRank(a.Stage) > stageRank(b.Stage)
	}
	return a.SuffixNum > b.SuffixNum
}
