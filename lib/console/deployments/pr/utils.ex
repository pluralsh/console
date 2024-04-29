defmodule Console.Deployments.Pr.Utils do
  use Nebulex.Caching
  alias Console.Deployments.{Stacks, Clusters, Services}
  alias Console.Schema.{PrAutomation, ScmConnection}

  @ttl :timer.hours(1)

  @stack_regex [~r/plrl\/stack\/([[:alnum:]_\-]+)\/?/, ~r/plrl\(stack:([[:alnum:]_\-]*)\)/, ~r/Plural Stack: ([[:alnum:]_\-]+)/]
  @svc_regex [~r/plrl\/svc\/([[:alnum:]_\-]+)\/?/, ~r/plrl\(service:([[:alnum:]_\-\/]*)\)/, ~r/Plural Service: ([[:alnum:]_\/\-]+)/]
  @cluster_regex [~r/plrl\/cluster\/([[:alnum:]_\-]+)\/?/, ~r/plrl\(cluster:([[:alnum:]_\-]*)\)/, ~r/Plural Cluster: ([[:alnum:]_\-]+)/]

  def pr_associations(content) do
    Enum.reduce(~w(stack service cluster)a, %{}, &maybe_add(&2, :"#{&1}_id", scrape(&1, content)))
  end

  defp maybe_add(attrs, field, %{id: id}), do: Map.put(attrs, field, id)
  defp maybe_add(attrs, _, _), do: attrs

  defp scrape(scope, content) do
    regexes(scope)
    |> Enum.flat_map(fn rgx ->
      Regex.scan(rgx, content)
      |> Enum.map(fn
        [_, match] -> match
        _ -> nil
      end)
      |> Enum.filter(& &1)
    end)
    |> Enum.find_value(&fetch(:stack, &1))
  end

  defp regexes(:stack), do: @stack_regex
  defp regexes(:service), do: @svc_regex
  defp regexes(:cluster), do: @cluster_regex

  @decorate cacheable(cache: Console.Cache, key: {:pr_fetch, scope, id}, opts: [ttl: @ttl])
  def fetch(scope, id), do: do_fetch(scope, id)

  defp do_fetch(:stack, name), do: Stacks.get_stack_by_name(name)
  defp do_fetch(:cluster, handle), do: Clusters.get_cluster_by_handle(handle)
  defp do_fetch(:service, identifier) do
    case String.split(identifier, "/") do
      [handle, name] -> Services.get_service_by_handle(handle, name)
      _ -> nil
    end
  end

  def description(%PrAutomation{message: msg, title: title}, ctx) do
    with {:ok, body} <- render_solid(msg, ctx),
         {:ok, title} <- render_solid(title, ctx),
      do: {:ok, title, body}
  end

  def render_solid(template, ctx) do
    with {:parse, {:ok, tpl}} <- {:parse, Solid.parse(template)},
         {:render, {:ok, res}} <- {:render, Solid.render(tpl, %{"context" => ctx})} do
      {:ok, IO.iodata_to_binary(res)}
    else
      {:parse, {:error, %Solid.TemplateError{message: message}}} -> {:error, message}
      {:render, {:error, errs, _}} -> {:error, "encountered #{length(errs)} while rendering pr description"}
    end
  end

  def url_and_token(%PrAutomation{connection: %ScmConnection{} = conn}, default),
    do: url_and_token(conn, default)
  def url_and_token(%ScmConnection{api_url: url, token: token}, _) when is_binary(url),
    do: {:ok, url, token}
  def url_and_token(%ScmConnection{base_url: url, token: token}, _) when is_binary(url),
    do: {:ok, url, token}
  def url_and_token(%ScmConnection{token: token}, default), do: {:ok, default, token}
  def url_and_token(_, _), do: {:error, "could not set up gitlab connection"}
end
