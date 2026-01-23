package version

import "fmt"

var (
	// Version is the semantic version of the nexus service
	Version = "dev"

	// GitCommit is the git commit hash
	GitCommit = "unknown"

	// BuildTime is the time when the binary was built
	BuildTime = "unknown"
)

// Info returns version information as a formatted string
func Info() string {
	return fmt.Sprintf("Nexus AI Proxy\nVersion: %s\nGit Commit: %s\nBuild Time: %s", Version, GitCommit, BuildTime)
}
