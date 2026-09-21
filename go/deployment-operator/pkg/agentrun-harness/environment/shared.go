package environment

const (
	EnvConsoleToken   = "PLRL_CONSOLE_TOKEN"
	EnvGitAccessToken = "GIT_ACCESS_TOKEN"
	EnvGitUsername    = "GIT_USERNAME"
	EnvGitAskpass     = "GIT_ASKPASS"

	// defaultGitUsername matches Console scm_creds, which fall back to "apikey"
	// when the SCM connection has no username. GitHub/GitLab accept that as
	// HTTP Basic username; Bitbucket Data Center needs the real username.
	defaultGitUsername = "apikey"
)
