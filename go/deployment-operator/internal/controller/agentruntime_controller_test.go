package controller

import (
	"context"
	"errors"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
	"github.com/stretchr/testify/mock"
)

var _ = Describe("AgentRuntime Controller", func() {
	Describe("createRunFromID", func() {
		It("retries pending run fetches and fails the run with the GraphQL error", func() {
			previousDelay := pendingAgentRunFetchDelay
			pendingAgentRunFetchDelay = 0
			DeferCleanup(func() {
				pendingAgentRunFetchDelay = previousDelay
			})

			runID := "run-123"
			gqlErr := errors.New("graphql: pending run is unavailable")
			consoleClient := mocks.NewClientMock(GinkgoT())
			consoleClient.EXPECT().
				GetAgentRun(mock.Anything, runID).
				Return(nil, gqlErr).
				Times(pendingAgentRunFetchRetries + 1)
			consoleClient.EXPECT().
				UpdateAgentRun(mock.Anything, runID, mock.MatchedBy(func(attrs console.AgentRunStatusAttributes) bool {
					return attrs.Status == console.AgentRunStatusFailed &&
						attrs.Error != nil &&
						*attrs.Error == gqlErr.Error()
				})).
				Return(&console.AgentRunFragment{ID: runID}, nil).
				Once()

			reconciler := &AgentRuntimeReconciler{
				Ctx:           context.Background(),
				ConsoleClient: consoleClient,
			}

			err := reconciler.createRunFromID(runID)
			Expect(err).To(MatchError(ContainSubstring("failed to get agent run after retries")))
			Expect(err).To(MatchError(ContainSubstring(gqlErr.Error())))
		})
	})
})
