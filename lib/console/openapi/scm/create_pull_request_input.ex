defmodule Console.OpenAPI.SCM.CreatePullRequestInput do
  @moduledoc """
  OpenAPI schema for creating a pull request via PR automation.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "CreatePullRequestInput",
    description: "Input for creating a pull request using a PR automation",
    properties: %{
      branch: string(description: "Branch name for the pull request (overrides default)"),
      identifier: string(description: "Repository identifier (overrides default)"),
      context: object(additional_properties: true, description: "Context variables to pass to the PR automation templates"),
    },
    required: [:context]
  }
end
