package utils

import (
	"bytes"
	"io"
	"text/template"

	"github.com/Masterminds/sprig/v3"
)

func GetFuncMap() template.FuncMap {
	funcs := sprig.TxtFuncMap()
	return funcs
}

func MakeTemplate(tmplate string) (*template.Template, error) {
	return template.New("gotpl").Funcs(GetFuncMap()).Parse(tmplate)
}

func RenderTemplate(wr io.Writer, tmplate string, ctx map[string]interface{}) error {
	tmpl, err := MakeTemplate(tmplate)
	if err != nil {
		return err
	}
	return tmpl.Execute(wr, ctx)
}

func RenderString(tmplate string, ctx map[string]interface{}) (string, error) {
	var buffer bytes.Buffer
	err := RenderTemplate(&buffer, tmplate, ctx)
	return buffer.String(), err
}
