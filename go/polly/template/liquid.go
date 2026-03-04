package template

import (
	"reflect"
	"runtime"
	"strings"

	"github.com/Masterminds/sprig/v3"
	"github.com/osteele/liquid"
	"github.com/samber/lo"
)

type FilterFunction struct {
	Name           string                      `json:"name"`
	Aliases        []string                    `json:"aliases,omitempty"`
	Documentation  FilterFunctionDocumentation `json:"description,omitempty"`
	Implementation string                      `json:"implementation,omitempty"`
}

type FilterFunctionDocumentation struct {
	Description string   `json:"description,omitempty"`
	Parameters  []string `json:"parameters,omitempty"`
	Example     string   `json:"example,omitempty"`
}

var (
	liquidEngine = liquid.NewEngine()

	// excludedSprigFunctions contains names of Spring functions that will be excluded.
	excludedSprigFunctions = []string{
		"date_in_zone",
		"date_modify",
		"hello",
		"must_date_modify",
		"now",
		"uuidv4",
		"split",
		"join",
		"downcase",
		"upcase",
		"replace",
		"append",
		"slice",
	}

	// sprigFunctionNameAliases contains additional aliases for Sprig functions.
	sprigFunctionNameAliases = map[string][]string{
		"dateInZone":     {"date_in_zone"},
		"dateModify":     {"date_modify"},
		"mustDateModify": {"must_date_modify"},
		"toJson":         {"to_json"},
		"fromJson":       {"from_json"},
		"semverCompare":  {"semver_compare"},
		"sha256sum":      {"sha26sum"},
	}

	// internalFunctions to register. These will override Sprig functions if same names are used.
	internalFunctions = map[string]any{
		"indent":  indent,
		"nindent": nindent,
		"replace": strings.ReplaceAll,
		"default": dfault,
		"ternary": ternary,
		"slice":   slice,
	}

	// registeredFunctions contains information about all registered template functions.
	registeredFunctions = map[string]FilterFunction{}
)

func init() {
	sprigFunctions := sprig.TxtFuncMap()
	for name, fnc := range sprigFunctions {
		_, hasInternalFunctionNameConflict := internalFunctions[name]
		if !lo.Contains(excludedSprigFunctions, name) && !hasInternalFunctionNameConflict {
			registerFilter(name, sprigFunctionNameAliases[name], fnc)
		}
	}

	for name, fnc := range internalFunctions {
		registerFilter(name, nil, fnc)
	}
}

func registerFilter(name string, aliases []string, fn any) {
	liquidEngine.RegisterFilter(name, fn)

	for _, alias := range aliases {
		liquidEngine.RegisterFilter(alias, fn)
	}

	registeredFunctions[name] = FilterFunction{
		Name:           name,
		Aliases:        aliases,
		Documentation:  functionDocs[name],
		Implementation: runtime.FuncForPC(reflect.ValueOf(fn).Pointer()).Name(),
	}
}

func RegisteredFilters() map[string]FilterFunction {
	return registeredFunctions
}

func RenderLiquid(input []byte, bindings map[string]interface{}) ([]byte, error) {
	return liquidEngine.ParseAndRender(input, bindings)
}
