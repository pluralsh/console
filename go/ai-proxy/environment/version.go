package environment

const (
	dev    = "0.0.0-dev"
	commit = "N/A"
)

// Version of this binary
var Version = dev
var Commit = commit

func IsDev() bool {
	return Version == dev
}
