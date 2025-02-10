defmodule Console.OCI.Client do
  alias Console.OCI.{Tags, Manifest}
  require Logger

  @manifest_types ~w(application/vnd.oci.image.manifest.v1+json application/vnd.docker.container.image.v1+json)

  defstruct [:client, :auth_client, :url]

  def new(url) do
    {h, repo} = parse_uri(url)
    repo = String.trim_leading(repo, "/")
    %__MODULE__{
      url: url,
      client: dkr_client(h, repo),
      auth_client: :empty
    }
  end

  def with_token(%{client: req} = client, token) do
    %{client | client: Req.Request.merge_options(req, auth: {:bearer, token})}
  end

  def with_credentials(client, username, password) do
    %{client | auth_client: {username, password}}
  end

  def append_repo(%{client: %Req.Request{options: %{dkr_repo: repo}}} = client, suffix) do
    put_in(client.client.options.dkr_repo, "#{repo}/#{suffix}")
  end

  def tags(client, query \\ "", acc \\ %Tags{}) do
    case authed_get(client, "/v2/:repo/tags/list?n=1000#{query}") do
      {:ok, %Req.Response{status: 200, body: body, headers: %{"link" => _}}} ->
        new = Tags.new(body)
        tags(client, "&last=#{List.last(new.tags)}", merge_tags(acc, new))
      {:ok, %Req.Response{status: 200, body: body}} ->
        {:ok, merge_tags(acc, Tags.new(body))}
      err -> handle_error(err)
    end
  end

  defp merge_tags(old, new), do: put_in(new.tags, Enum.concat(new.tags, old.tags))

  def manifest(%{client: req} = client, tag) do
    req = Req.Request.put_header(req, "accept", @manifest_types)

    %{client | client: req}
    |> authed_get("/v2/:repo/manifests/#{tag}")
    |> case do
      {:ok, %Req.Response{status: 200, body: body}} ->
        {:ok, Manifest.build(body)}
      err -> handle_error(err)
    end
  end

  def blob(client, digest), do: authed_get(client, "/v2/:repo/blobs/#{digest}")

  def download_blob(client, digest, to), do: authed_get(client, "/v2/:repo/blobs/#{digest}", into: to)

  defp dkr_client(h, repo) do
    Req.new(base_url: "https://#{h}", retry: false)
    |> Req.Request.register_options([:dkr_repo])
    |> Req.Request.merge_options(dkr_repo: repo)
    |> Req.Request.append_request_steps(dkr_repo: fn %{options: %{dkr_repo: repo}} = req ->
      update_in(req.url.path, fn
        nil -> nil
        p -> String.replace(p, ":repo", repo) # docker doesn't expect these to be url encoded which is weird
      end)
    end)
    |> Req.Request.prepend_response_steps(dkr_repo: & &1)
  end

  defp authed_get(%__MODULE__{client: req, auth_client: auth} = client, url, opts \\ []) do
    case Req.get(req, add_opts(req, [url: url], opts)) do
      {:ok, %Req.Response{status: 200}} = resp -> resp
      {:ok, %Req.Response{status: 401, headers: %{"www-authenticate" => [www_auth | _]}}} ->
        with [bearer: auth_params] <- :cow_http_hd.parse_www_authenticate(www_auth),
             %{"realm" => auth_url, "service" => svc, "scope" => scope} = Map.new(auth_params),
            {:ok, token} <- authenticate(auth_url, svc, scope, auth) do
          with_token(client, token)
          |> authed_get(url, opts)
        else
          {:error, _} = err -> err
          _ -> {:error, "could not resolve authentication for #{url}"}
        end
      err -> err
    end
  end

  # don't attempt to stream unless we're authenticated
  defp add_opts(%{options: %{auth: {:bearer, _}}}, base, opts), do: base ++ opts
  defp add_opts(_, base, _), do: base

  defp authenticate(url, svc, scope, auth) do
    auth_client(auth)
    |> Req.get(url: "#{url}?#{URI.encode_query(%{service: svc, scope: scope})}")
    |> case do
      {:ok, %Req.Response{status: 200, body: %{"token" => token}}} -> {:ok, token}
      {:ok, %Req.Response{body: body}} -> {:error, "authentication failure: #{inspect(body)}"}
      err -> err
    end
  end

  defp auth_client(:empty), do: Req.new(retry: false)
  defp auth_client({u, p}), do: Req.new(auth: {:basic, "#{u}:#{p}"}, retry: false)

  defp parse_uri(uri) do
    case URI.parse(uri) do
      %URI{scheme: "oci", host: h, path: p} when is_binary(h) and byte_size(p) > 1 ->
        {h, p}
      %URI{scheme: nil, host: nil, path: p} -> parse_dkr_url(p)
    end
  end

  defp parse_dkr_url(url) do
    [h | _ ] = split = String.split(url, "/")
    case {String.contains?(h, "."), split} do
      {_, [_]} -> {"registry-1.docker.io", url}
      {true, [host | rest]} -> {host, Enum.join(rest, "/")}
      {_, path} -> {"registry-1.docker.io", Enum.join(path, "/1")}
    end
  end

  defp handle_error({:ok, %Req.Response{body: body}}), do: {:error, "OCI error: #{inspect(body)}"}
  defp handle_error(err) do
    Logger.warning "oci client error: #{inspect(err)}"
    {:error, "oci client error"}
  end
end
