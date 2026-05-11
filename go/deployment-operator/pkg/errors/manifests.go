package errors

import (
	"fmt"
)

var ErrUnauthenticated = fmt.Errorf("cannot access the plural api, %w", ErrExpected)
var ErrTransientManifest = fmt.Errorf("this is a temporary api error, %w", ErrExpected)
