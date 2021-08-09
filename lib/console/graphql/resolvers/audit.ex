defmodule Console.GraphQl.Resolvers.Audit do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.Audit

  def list_audits(args, _) do
    Audit.ordered()
    |> filter_repo(args)
    |> paginate(args)
  end

  def audit_metrics(_, _) do
    cutoff = Timex.now() |> Timex.shift(months: -1)
    Audit.created_after(cutoff)
    |> Audit.aggregate()
    |> Console.Repo.all()
    |> ok()
  end

  defp filter_repo(query, %{repo: repo}), do: Audit.for_repo(query, repo)
  defp filter_repo(query, _), do: query
end
