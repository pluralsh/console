package mocks

import (
	"fmt"
)

var TestingT = &MockTestingT{}

// MockTestingT mocks a test struct
type MockTestingT struct{}

const mockTestingTFailNowCalled = "FailNow was called"

func (m *MockTestingT) Logf(msg string, opts ...interface{}) {
	fmt.Printf(msg, opts...)
}

func (m *MockTestingT) Errorf(msg string, opts ...interface{}) {
	fmt.Printf(msg, opts...)
}

// FailNow mocks the FailNow call.
// It panics in order to mimic the FailNow behavior in the sense that
// the execution stops.
// When expecting this method, the call that invokes it should use the following code:
//
//	assert.PanicsWithValue(t, mockTestingTFailNowCalled, func() {...})
func (m *MockTestingT) FailNow() {
	// this function should panic now to stop the execution as expected
	panic(mockTestingTFailNowCalled)
}

func (m *MockTestingT) Cleanup(f func()) {
	f()
}
