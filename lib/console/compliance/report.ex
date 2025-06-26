defmodule Console.Compliance.Report do
  alias Console.Compliance.Datasource.{Clusters, Services, Vulnerabilities, Users, Flows}
  alias Console.Deployments.{Policies, Settings, Policy}
  alias Console.Schema.{User, ComplianceReportGenerator}

  @type format :: :csv | :json

  def allow(%User{roles: %{admin: true}} = user), do: {:ok, user}
  def allow(%User{} = user), do: Policies.allow(Settings.fetch(), user, :read)

  def allow(name, %User{} = user) do
    with %ComplianceReportGenerator{} = gen <- Policy.get_report_generator_by_name(name),
      do: Policies.allow(gen, user, :read)
  end

  def report(:csv) do
    Zstream.zip([
      Zstream.entry("clusters.csv", Clusters.stream() |> CSV.encode(headers: true)),
      Zstream.entry("services.csv", Services.stream() |> CSV.encode(headers: true)),
      Zstream.entry("vulnerabilities.csv", Vulnerabilities.stream() |> CSV.encode(headers: true)),
      Zstream.entry("users.csv", Users.stream() |> CSV.encode(headers: true)),
      Zstream.entry("flows.csv", Flows.stream() |> CSV.encode(headers: true)),
    ])
  end

  def report(:json) do
    Zstream.zip([
      Zstream.entry("clusters.json", Clusters.stream() |> Stream.map(&Jason.encode!/1)),
      Zstream.entry("services.json", Services.stream() |> Stream.map(&Jason.encode!/1)),
      Zstream.entry("vulnerabilities.json", Vulnerabilities.stream() |> Stream.map(&Jason.encode!/1)),
      Zstream.entry("users.json", Users.stream() |> Stream.map(&Jason.encode!/1)),
      Zstream.entry("flows.json", Flows.stream() |> Stream.map(&Jason.encode!/1)),
    ])
  end
end
