defmodule Console.Deployments.Git.Webhooks do
  alias Console.Schema.{ScmWebhook}
  alias Console.Deployments.Git
  alias Console.Deployments.Pr.Dispatcher
  alias Console.Services.Users

  def webhook(
    %ScmWebhook{type: :github},
    %{
      "action" => "membership",
      "member" => %{"email" => email},
      "organization" => %{"name" => org},
      "team" => %{"name" => team}
    }) do
    IO.inspect("here")
    with {:ok, _} <- Users.add_github_team_member(email, org, team),
      do: {:ok, %{ignored: false, message: "added #{email} to team #{org}:#{team}"}}
  end

  def webhook(hook, params) do
    with {:ok, url, params} <- Dispatcher.pr(hook, params),
         {:ok, _} <- Git.upsert_pull_request(params, url),
      do: {:ok, %{ignored: false, message: "updated pull request"}}
  end
end
