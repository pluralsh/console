defmodule Console.OpenAPI.SCM.PullRequest do
  @moduledoc """
  OpenAPI schema for pull requests.

  A pull request represents a reference to a pull request created through PR automation
  or tracked for deployment workflows like service updates or stack changes.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of pull requests", %{
    type: :object,
    description: "A paginated list of pull requests",
    properties: %{
      data: array_of(PullRequest)
    }
  }

  defschema %{
    type: :object,
    title: "PullRequest",
    description: "A pull request reference tracked by the platform for deployment workflows",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the pull request record"),
      url: string(description: "URL of the pull request in the source control provider"),
      title: string(description: "Title of the pull request"),
      body: string(description: "Body/description of the pull request"),
      status: ecto_enum(Console.Schema.PullRequest.Status, description: "Current status of the pull request (open, merged, closed)"),
      creator: string(description: "Username of the pull request creator in the source control provider"),
      labels: array_of(string(), description: "Labels applied to the pull request"),
      ref: string(description: "Git ref (branch name) for the pull request"),
      sha: string(description: "Git SHA of the pull request head"),
      cluster_id: string(description: "ID of the cluster this pull request is associated with, if any"),
      service_id: string(description: "ID of the service this pull request is associated with, if any"),
      stack_id: string(description: "ID of the stack this pull request is associated with, if any"),
    })
  }
end
