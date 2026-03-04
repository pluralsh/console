package grpctool

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func makePtr(x int64) *int64 {
	return &x
}

func TestHttpRequest_Header_IsRequestWithoutBody(t *testing.T) {
	testcases := []struct {
		name                  string
		contentLength         *int64
		expectedIsWithoutBody bool
	}{
		{
			name:                  "no content length is set, expecting body",
			contentLength:         nil,
			expectedIsWithoutBody: false,
		},
		{
			name:                  "content length is -1, expecting body",
			contentLength:         makePtr(-1),
			expectedIsWithoutBody: false,
		},
		{
			name:                  "content length is 0, NOT expecting body",
			contentLength:         makePtr(0),
			expectedIsWithoutBody: true,
		},
		{
			name:                  "content length is 1, expecting body",
			contentLength:         makePtr(1),
			expectedIsWithoutBody: false,
		},
	}
	for _, tc := range testcases {
		t.Run(tc.name, func(t *testing.T) {
			// GIVEN
			header := HttpRequest_Header{
				ContentLength: tc.contentLength,
			}

			// WHEN
			isWithoutBody := header.IsRequestWithoutBody()

			// THEN
			assert.Equal(t, tc.expectedIsWithoutBody, isWithoutBody)
		})
	}
}
