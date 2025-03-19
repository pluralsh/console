package main

import (
	"log"
	"strings"

	"github.com/pluralsh/console/go/helmchartutils/args"
	"github.com/pluralsh/console/go/helmchartutils/fileutils"
	"github.com/pluralsh/console/go/helmchartutils/yaml"
)

func main() {
	args.Init()

	templateDir := args.TemplateDir()
	recursive := args.SearchDirRecursive()
	prefix := args.Prefix()
	outputFileType := args.OutputFile()

	log.Print("Searching directory for templates: ", templateDir, " recursive: ", recursive)
	filenames := fileutils.ListAllFiles(templateDir, recursive)
	log.Print("Found files:\n", strings.Join(filenames, "\n"))

	itemsTree := yaml.NewItemsTreeNode()
	log.Print("Scanning files for references to: ", prefix)
	for _, filename := range filenames {
		yaml.BuildReferenceTree(fileutils.GetFileContents(filename), prefix, itemsTree)
	}

	log.Print("Writing output to ", outputFileType)
	stringTree := yaml.ItemTreeToString(itemsTree)
	fileutils.WriteOutput(args.OutputFile(), stringTree)

	log.Print("Done")
}
