package template

import (
	"bytes"
	"fmt"
	"text/template"

	"github.com/Masterminds/sprig/v3"
)

// include function to include other templates
func include(tpl *template.Template, name string, data interface{}) (string, error) {
	// include the named template from the `define` directive in the current template
	inc := tpl.Lookup(name)
	if inc == nil {
		return "", fmt.Errorf("template %s not found", name)
	}

	var buffer bytes.Buffer
	err := inc.Execute(&buffer, data)
	if err != nil {
		return "", err
	}

	return buffer.String(), nil
}

// RenderTpl renders the given Helm .tpl template with the provided bindings and automatically includes additional templates from a directory.
func RenderTpl(input []byte, bindings map[string]interface{}) ([]byte, error) {

	tpl := template.New("gotpl")

	// Create a new template and add the sprig functions and the include function.
	tpl.Funcs(sprig.TxtFuncMap()).Funcs(template.FuncMap{
		"include": func(name string, data interface{}) (string, error) {
			return include(tpl, name, data)
		},
	})

	tpl, err := tpl.Parse(string(input))
	if err != nil {
		return nil, err
	}

	var buffer bytes.Buffer
	err = tpl.Execute(&buffer, bindings)
	return buffer.Bytes(), err
}
