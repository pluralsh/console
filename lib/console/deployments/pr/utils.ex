defmodule Console.Deployments.Pr.Utils do
  alias Console.Schema.{PrAutomation, ScmConnection}

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
