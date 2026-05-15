package exec

func WithExecutionStrategy(strategy ExecutionStrategy) ExecutorOption {
	return func(e *executor) {
		e.strategy = strategy
	}
}

func WithPostRunFunc(fn func(string, error)) ExecutorOption {
	return func(e *executor) {
		e.postRunFunc = fn
	}
}

func WithPreRunFunc(fn func(string)) ExecutorOption {
	return func(e *executor) {
		e.preRunFunc = fn
	}
}
