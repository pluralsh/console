defmodule ConsoleWeb.EmailView do
  use ConsoleWeb, :view

  def url(path), do: "#{Console.conf(:host)}#{path}"

  def row(assigns \\ %{}, do: block), do: render_template("row.html", assigns, block)

  def text(assigns \\ %{}, do: block), do: render_template("text.html", assigns, block)

  def btn(assigns \\ %{}, do: block), do: render_template("button.html", assigns, block)

  def space(assigns \\ %{}), do: ConsoleWeb.SharedView.render("space.html", Map.new(assigns))

  def pre(assigns \\ %{}, do: block), do: render_template("pre.html", assigns, block)

  def img(assigns \\ %{}) do
    assigns = Map.new(assigns) |> img_defaults()
    ConsoleWeb.SharedView.render("image.html", assigns)
  end

  defp img_defaults(assigns) do
    Map.put_new(assigns, :width, 50)
    |> Map.put_new(:height, 50)
  end

  defp render_template(template, assigns, block) do
    assigns =
      assigns
      |> Map.new()
      |> Map.put(:inner_content, block)

    ConsoleWeb.SharedView.render(template, assigns)
  end
end
