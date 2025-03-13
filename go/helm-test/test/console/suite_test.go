package console_test

import (
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

func TestSuiteSetup(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Console Chart Suite")
}
