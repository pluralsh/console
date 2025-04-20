defmodule Console.Compliance.Report do
  alias Console.Compliance.Datasource.{Clusters, Services, Vulnerabilities}
  alias Console.Deployments.{Policies, Settings}
  alias Console.Schema.{User}

  @type format :: :csv

  def allow(%User{roles: %{admin: true}} = user), do: {:ok, user}
  def allow(%User{} = user), do: Policies.allow(Settings.fetch(), user, :read)

  def report(:csv) do
    Zstream.zip([
      Zstream.entry("clusters.csv", Clusters.stream() |> CSV.encode(headers: true)),
      Zstream.entry("services.csv", Services.stream() |> CSV.encode(headers: true)),
      Zstream.entry("vulnerabilities.csv", Vulnerabilities.stream() |> CSV.encode(headers: true)),
    ])
  end
end
