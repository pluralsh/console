package main

import (
	"io"
	"os"
	"path"
	"sort"
	"strings"
	"text/template"

	"github.com/Masterminds/sprig/v3"
	tmpl "github.com/pluralsh/polly/template"
	"github.com/samber/lo"
)

const (
	docsPath     = "docs/liquid-filters.md"
	docsTemplate = "docs/liquid-filters.tmpl"
)

func main() {
	f, err := os.Create(docsPath)
	if err != nil {
		panic(err)
	}

	if err = generateFilterDocs(f, registeredFilters(), docsTemplate); err != nil {
		panic(err)
	}
}

func registeredFilters() []tmpl.FilterFunction {
	filters := lo.Values(tmpl.RegisteredFilters())
	sort.Slice(filters, func(i, j int) bool {
		return strings.Compare(filters[i].Name, filters[j].Name) < 0
	})

	return filters
}

func generateFilterDocs(writer io.Writer, filters []tmpl.FilterFunction, templatePath string) error {
	t := template.Must(template.New(path.Base(templatePath)).Funcs(sprig.TxtFuncMap()).ParseFiles(templatePath))
	return t.Execute(writer, filters)
}
