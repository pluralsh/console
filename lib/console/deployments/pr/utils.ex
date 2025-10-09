defmodule Console.Deployments.Pr.Utils do
  use Nebulex.Caching
  alias Console.Deployments.{Stacks, Clusters, Services, Flows}
  alias Console.Schema.{PrAutomation, ScmConnection}

  @ttl :timer.hours(1)

  @adapter Console.conf(:cache_adapter)

  @ansi_code ~r/\x1b\[[0-9;]*m/

  @stack_regex [~r/plrl\/stacks?\/([[:alnum:]_\-]+)\/?/, ~r/plrl\(stacks?:([[:alnum:]_\-]*)\)/, ~r/Plural [sS]tacks?:\s+([[:alnum:]_\-]+)/]
  @svc_regex [~r/plrl\/svcs?\/([[:alnum:]_\-]+)\/?/, ~r/plrl\(services?:([[:alnum:]_\-\/]*)\)/, ~r/Plural [sS]ervices?:\s+([[:alnum:]_\/\-]+)/]
  @cluster_regex [~r/plrl\/clusters?\/([[:alnum:]_\-]+)\/?/, ~r/plrl\(clusters?:([[:alnum:]_\-]*)\)/, ~r/Plural [cC]lusters?:\s+([[:alnum:]_\-]+)/]
  @flow_regex [~r/plrl\/flow\/([[:alnum:]_\-]+)\/?/, ~r/plrl\(flow:([[:alnum:]_\-]*)\)/, ~r/Plural [fF]low:\s+([[:alnum:]_\-]+)/]
  @preview_regex [~r/plrl\/preview\/([[:alnum:]_\-]+)\/?/, ~r/plrl\(preview:([[:alnum:]_\-]*)\)/, ~r/Plural [pP]review:\s+([[:alnum:]_\-]+)/]
  @merge_cron_regex [~r/[Pp]lural [Mm]erge [Cc]ron:\s+([0-9,\-*\/]+\s[0-9,\-*\/]+\s[0-9,\-*\/]+\s[0-9,\-*\/]+\s[0-9,\-*\/]+)/]

  @solid_opts [strict_variables: true, strict_filters: true]

  def filter_ansi(text), do: String.replace(text, @ansi_code, "")

  def pr_associations(content, scopes \\ ~w(stack cluster service flow)a) do
    Enum.reduce(scopes, %{}, &maybe_add(&2, :"#{&1}_id", scrape(&1, content)))
    |> Map.put(:preview, scrape(:preview, content))
    |> Map.put(:merge_cron, scrape(:merge_cron, content))
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
    |> Enum.find_value(&fetch(scope, &1))
  end

  defp regexes(:stack), do: @stack_regex
  defp regexes(:service), do: @svc_regex
  defp regexes(:cluster), do: @cluster_regex
  defp regexes(:flow), do: @flow_regex
  defp regexes(:preview), do: @preview_regex
  defp regexes(:merge_cron), do: @merge_cron_regex

  @decorate cacheable(cache: @adapter, key: {:pr_fetch, scope, id}, opts: [ttl: @ttl])
  def fetch(scope, id), do: do_fetch(scope, id)

  defp do_fetch(:stack, name), do: Stacks.get_stack_by_name(name)
  defp do_fetch(:cluster, handle), do: Clusters.get_cluster_by_handle(handle)
  defp do_fetch(:flow, name), do: Flows.get_by_name(name)
  defp do_fetch(:service, identifier) do
    case String.split(identifier, "/") do
      [handle, name] -> Services.get_service_by_handle(handle, name)
      _ -> nil
    end
  end
  defp do_fetch(:preview, name), do: name
  defp do_fetch(:merge_cron, cron), do: cron

  def description(%PrAutomation{message: msg, title: title}, ctx) do
    with {:ok, body} <- render_solid(msg, ctx),
         {:ok, title} <- render_solid(title, ctx),
      do: {:ok, title, body}
  end

  def render_solid_raw(template, ctx) do
    with {:parse, {:ok, tpl}} <- {:parse, Solid.parse(template)},
         {:render, {:ok, res, _}} <- {:render, Solid.render(tpl, %{"context" => ctx}, @solid_opts)} do
      {:ok, IO.iodata_to_binary(res)}
    else
      {:parse, {:error, %Solid.TemplateError{} = err}} -> {:error, Solid.TemplateError.message(err)}
      {:render, {:error, errs, _}} -> {:error, Enum.map(errs, &inspect/1) |> Enum.join(", ")}
    end
  end

  def render_solid(template, ctx) do
    with {:parse, {:ok, tpl}} <- {:parse, Solid.parse(template)},
         {:render, {:ok, res, _}} <- {:render, Solid.render(tpl, %{"context" => ctx}, @solid_opts)} do
      {:ok, IO.iodata_to_binary(res)}
    else
      {:parse, {:error, %Solid.TemplateError{} = err}} -> {:error, Solid.TemplateError.message(err)}
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
