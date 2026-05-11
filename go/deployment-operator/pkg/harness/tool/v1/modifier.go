package v1

import (
	"io"
)

// Args implements [ArgsModifier] interface.
func (in *DefaultModifier) Args(args []string) []string {
	return args
}

// WriteCloser implements [PassthroughModifier] interface.
func (in *DefaultModifier) WriteCloser() []io.WriteCloser {
	return make([]io.WriteCloser, 0)
}

// Env implements [EnvModifier] interface.
func (in *DefaultModifier) Env(env []string) []string {
	return env
}

func NewDefaultModifier() Modifier {
	return &DefaultModifier{}
}

func (in *multiModifier) Args(args []string) []string {
	for _, mod := range in.modifiers {
		args = mod.Args(args)
	}

	return args
}

func (in *multiModifier) WriteCloser() []io.WriteCloser {
	result := make([]io.WriteCloser, 0)
	for _, mod := range in.modifiers {
		writers := mod.WriteCloser()
		if len(writers) == 0 {
			continue
		}

		result = append(result, mod.WriteCloser()...)
	}

	return result
}

func (in *multiModifier) Env(env []string) []string {
	for _, mod := range in.modifiers {
		env = mod.Env(env)
	}

	return env
}

func NewMultiModifier(modifiers ...Modifier) Modifier {
	return &multiModifier{modifiers}
}
