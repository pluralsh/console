package insightpriority

// SetRunFunc replaces how scripts are run, so evaluator tests do not need the Python runtime.
func SetRunFunc(e *Evaluator, run RunFunc) {
	e.run = run
}
