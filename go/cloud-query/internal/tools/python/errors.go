package python

import "github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"

// CodeOf returns err's stable runner error code, or Internal for unclassified errors.
func CodeOf(err error) Code { return contract.CodeOf(err) }

// PublicMessage returns the safe summary suitable for untrusted callers. It
// never includes private worker or process diagnostics.
func PublicMessage(err error) string { return contract.PublicMessage(err) }
