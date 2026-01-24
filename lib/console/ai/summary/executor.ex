defmodule Console.AI.Summary.Executor do
  alias Console.AI.Provider
  alias Console.AI.Tools.Explain.Summary

  @preface """
  You are a seasoned devops engineer with experience in Kubernetes, GitOps and Infrastructure As Code, and need to
  give a concise but clear explanation of issues in your company's kubernetes infrastructure or software stack. You are
  trying to get an answer about a specific component and should answer with either a summary with the needed details in markdown format or explaining that
  the information is simply not relevant and should be ignored.
  """

  @spec execute(Provider.history, binary) :: {:ok, binary, boolean} | Console.error
  def execute(history, prompt) do
    case Provider.simple_tool_call(history ++ [{:user, "And here is what I what to understand about this: #{prompt}"}], Summary, preface: @preface) do
      {:ok, %Summary{relevant: r, summary: summary}} -> {:ok, summary, r}
      error -> error
    end
  end
end
