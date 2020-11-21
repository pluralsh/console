defmodule Watchman.GraphQl.Resolvers.Audit do
  use Watchman.GraphQl.Resolvers.Base, model: Watchman.Schema.Audit

  def list_audits(args, _) do
    Audit.ordered()
    |> filter_repo(args)
    |> paginate(args)
  end

  defp filter_repo(query, %{repo: repo}), do: Audit.for_repo(query, repo)
  defp filter_repo(query, _), do: query
end