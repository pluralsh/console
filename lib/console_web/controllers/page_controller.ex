defmodule ConsoleWeb.PageController do
  use ConsoleWeb, :controller

  def index(conn, _params) do
    html(conn, File.read!(Path.join(:code.priv_dir(:console), "static/index.html")))
  end
end
