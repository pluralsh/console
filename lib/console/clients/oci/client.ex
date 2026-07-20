defmodule Console.OCI.Client do
  alias Console.OCI.{Tags, Manifest, Repositories}
  require Logger

  @manifest_types Enum.join(
    ~w(
      application/vnd.oci.image.manifest.v1+json
      application/vnd.docker.container.image.v1+json
      application/vnd.oci.image.index.v1+json
      application/vnd.docker.distribution.manifest.list.v2+json
    ),
    ", "
  )

  defstruct [:client, :auth_client, :url, :proxy]

  def new(url, proxy \\ nil) do
    {h, repo} = parse_uri(url)
    repo = String.trim_leading(repo, "/")
    %__MODULE__{
      url: url,
      client: dkr_client(h, repo, proxy),
      auth_client: :empty,
      proxy: proxy
    }
  end

  def with_proxy(%__MODULE__{} = client, nil), do: client

  def with_proxy(%__MODULE__{client: req} = client, proxy) do
    %{client | client: put_proxy(req, proxy), proxy: proxy}
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

  def tags(client, filter \\ fn _ -> true end, query \\ "", acc \\ %Tags{}, limit \\ nil) do
    case authed_get(client, "/v2/:repo/tags/list?n=1000#{query}") do
      {:ok, %Req.Response{status: status, body: body, headers: %{"link" => _}}} when status in 200..299 ->
        new = Tags.new(body, filter)
        merged = merge_tags(acc, new)
        cond do
          limit_reached?(merged.tags, limit) -> {:ok, trim_tags(merged, limit)}
          is_nil(last(body["tags"])) -> {:ok, merged}
          true -> tags(client, filter, "&last=#{last(body["tags"])}", merged, limit)
        end
      {:ok, %Req.Response{status: status, body: body}} when status in 200..299 ->
        {:ok, merge_tags(acc, Tags.new(body, filter)) |> trim_tags(limit)}
      err -> handle_error(err)
    end
  end

  defp merge_tags(old, new), do: put_in(new.tags, Enum.concat(new.tags, old.tags))
  defp trim_tags(tags, nil), do: tags
  defp trim_tags(%Tags{} = tags, limit) when is_integer(limit),
    do: put_in(tags.tags, Enum.take(tags.tags, limit))

  defp trim_tags(tags, _), do: tags

  def repositories(client, filter \\ fn _ -> true end, query \\ "", acc \\ %Repositories{}, limit \\ nil) do
    case authed_get(client, "/v2/_catalog?n=1000#{query}") do
      {:ok, %Req.Response{status: status, body: body, headers: %{"link" => _}}} when status in 200..299 ->
        new = Repositories.new(body, filter)
        merged = merge_repositories(acc, new)
        cond do
          limit_reached?(merged.repositories, limit) -> {:ok, trim_repositories(merged, limit)}
          is_nil(last(body["repositories"])) -> {:ok, merged}
          true -> repositories(client, filter, "&last=#{last(body["repositories"])}", merged, limit)
        end
      {:ok, %Req.Response{status: status, body: body}} when status in 200..299 ->
        {:ok, merge_repositories(acc, Repositories.new(body, filter)) |> trim_repositories(limit)}
      err -> handle_error(err)
    end
  end

  defp merge_repositories(old, new), do: put_in(new.repositories, Enum.concat(new.repositories, old.repositories))

  defp limit_reached?(_, nil), do: false
  defp limit_reached?(items, limit) when is_integer(limit), do: length(items) >= limit
  defp limit_reached?(_, _), do: false

  defp trim_repositories(repositories, nil), do: repositories
  defp trim_repositories(%Repositories{} = repositories, limit) when is_integer(limit),
    do: put_in(repositories.repositories, Enum.take(repositories.repositories, limit))
  defp trim_repositories(repositories, _), do: repositories

  defp last([_ | _] = items), do: List.last(items)
  defp last(_), do: nil

  def manifest(%{client: req} = client, tag) do
    req = Req.Request.put_header(req, "accept", @manifest_types)

    %{client | client: req}
    |> authed_get("/v2/:repo/manifests/#{tag}")
    |> case do
      {:ok, %Req.Response{status: status, body: body}} when status in 200..299 ->
        Manifest.build(body)
      err -> handle_error(err)
    end
  end

  def blob(client, digest), do: authed_get(client, "/v2/:repo/blobs/#{digest}")

  def download_blob(client, digest, to) do
    url = "/v2/:repo/blobs/#{digest}"
    with {:ok, %{client: req}} <- prepare_blob_download(client, url),
      do: stream_blob(req, url, to)
  end

  defp dkr_client(h, repo, proxy) do
    Req.new(base_url: "https://#{h}", retry: false, redirect: true)
    |> put_proxy(proxy)
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
    {no_recurse, opts} = Keyword.pop(opts, :no_recurse, false)
    case {Req.get(req, add_opts(req, [url: url], opts)), no_recurse} do
      {{:ok, %Req.Response{status: status}} = resp, true} when status in 200..299 -> resp
      {{:ok, %Req.Response{status: 401, headers: %{"www-authenticate" => [www_auth | _]}}}, false} ->
        with {:ok, client} <- authenticate_challenge(client, url, www_auth, auth),
          do: authed_get(client, url, Keyword.put(opts, :no_recurse, true))
      {_, true} -> {:error, "could not resolve authentication for #{url}"}
      {err, _} -> err
    end
  end

  # don't attempt to stream unless we're authenticated
  defp add_opts(%{options: %{auth: {:bearer, _}}}, base, opts), do: base ++ opts
  defp add_opts(_, base, _), do: base

  defp prepare_blob_download(%__MODULE__{client: req, auth_client: auth} = client, url) do
    case Req.head(req, url: url, redirect: true) do
      {:ok, %Req.Response{status: status}} when status in 200..299 -> {:ok, client}
      {:ok, %Req.Response{status: 401, headers: %{"www-authenticate" => [www_auth | _]}}} ->
        authenticate_challenge(client, url, www_auth, auth)
      err -> handle_error(err)
    end
  end

  defp stream_blob(req, url, to) do
    case Req.get(req, url: url, into: to, redirect: true) do
      {:ok, %Req.Response{status: status}} = resp when status in 200..299 -> resp
      err -> handle_error(err)
    end
  end

  defp authenticate_challenge(client, url, www_auth, auth) do
    with [bearer: auth_params] <- :cow_http_hd.parse_www_authenticate(www_auth),
         %{"realm" => auth_url, "service" => svc} = params <- Map.new(auth_params),
         scope = params["scope"],
         {:ok, token} <- authenticate(auth_url, svc, scope, auth, client.proxy) do
      {:ok, with_token(client, token)}
    else
      {:error, _} = err -> err
      _ -> {:error, "could not resolve authentication for #{url}"}
    end
  end

  defp authenticate(url, svc, scope, auth, proxy) do
    auth_client(auth, proxy, url)
    |> Req.get(url: "#{url}?#{URI.encode_query(Console.drop_nils(%{service: svc, scope: scope}))}")
    |> case do
      {:ok, %Req.Response{status: 200, body: %{"token" => token}}} -> {:ok, token}
      {:ok, %Req.Response{status: 200, body: %{"access_token" => token}}} -> {:ok, token}
      {:ok, %Req.Response{body: body}} -> {:error, "authentication failure: #{inspect(body)}" }
      err -> err
    end
  end

  defp auth_client(:empty, proxy, url), do: Req.new(retry: false) |> put_proxy(proxy, url)
  defp auth_client({u, p}, proxy, url), do: Req.new(auth: {:basic, "#{u}:#{p}"}, retry: false) |> put_proxy(proxy, url)

  defp put_proxy(req, proxy, url \\ nil)
  defp put_proxy(req, %{url: url} = proxy, request_url) when is_binary(url) do
    case no_proxy?(proxy, request_url || req.url) do
      true -> req
      false -> Req.Request.merge_options(req, proxy: url)
    end
  end
  defp put_proxy(req, _, _), do: req

  defp no_proxy?(%{noproxy: noproxy}, url) when is_binary(noproxy) and byte_size(noproxy) > 0 do
    host = url_host(url)
    noproxy
    |> String.split(",", trim: true)
    |> Enum.map(&String.trim/1)
    |> Enum.any?(&matches_no_proxy?(host, &1))
  end
  defp no_proxy?(_, _), do: false

  defp url_host(%URI{host: host}), do: host
  defp url_host(url) when is_binary(url), do: URI.parse(url).host
  defp url_host(_), do: nil

  defp matches_no_proxy?(host, pattern) when is_binary(host) and is_binary(pattern) do
    pattern = String.trim_leading(pattern, ".")
    host == pattern || String.ends_with?(host, ".#{pattern}")
  end
  defp matches_no_proxy?(_, _), do: false

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

  defp handle_error({:ok, %Req.Response{status: status, body: body}}),
    do: {:error, "OCI error status=#{status}: #{inspect(body)}"}
  defp handle_error(err) do
    Logger.warning "oci client error: #{inspect(err)}"
    {:error, "oci client error #{format(err)}"}
  end

  defp format({:error, err}) when is_binary(err), do: err
  defp format({:error, err}), do: "unknown error: #{inspect(err)}"
  defp format(_), do: "unknown error"
end
