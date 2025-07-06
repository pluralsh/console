defmodule Console.Deployments.Pr.Governance.Impl.Base do
  @moduledoc """
  A base implementation for the pr governance controller
  """
  alias Console.Schema.PullRequest

  def body(%PullRequest{} = pr) do
    Map.take(pr, [:id, :title, :url, :ref, :labels, :status, :body])
  end
end
