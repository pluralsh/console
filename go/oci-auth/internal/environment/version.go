package environment

const dev = "dev"

var (
	// Version is managed by GoReleaser, see: https://goreleaser.com/cookbooks/using-main.version/
	Version = dev

	// Commit is managed by GoReleaser, see: https://goreleaser.com/cookbooks/using-main.version/
	Commit = "none"
)

func IsDev() bool {
	return Version == dev
}
