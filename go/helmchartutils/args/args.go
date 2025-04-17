package args

import (
	"flag"
)

const (
	defaultChartDir        = "../../charts/console/templates/"
	defaultReferencePrefix = ".Values"
	defaultOutputFile      = "output.ref"
)

var (
	argChartDir        = flag.String("chart-dir", defaultChartDir, "The directory containing the helm templates. Default "+defaultChartDir)
	argRecursive       = flag.Bool("recursive", true, "Whether or not to recursively search for templates. Default true")
	argReferencePrefix = flag.String("ref-prefix", defaultReferencePrefix, "The prefix to use when analyzing references. Default "+defaultReferencePrefix)
	argOutputFile      = flag.String("output-file", defaultOutputFile, "The file to write the output to. Default "+defaultOutputFile)
)

func Init() {
	flag.Parse()
}

func TemplateDir() string {
	return *argChartDir
}

func SearchDirRecursive() bool {
	return *argRecursive
}

func Prefix() string {
	return *argReferencePrefix
}

func OutputFile() string {
	return *argOutputFile
}
