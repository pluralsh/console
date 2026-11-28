defmodule ConsoleWeb.EmailView do
  use ConsoleWeb, :view
  import ConsoleWeb.EmailComponents

  def url(path), do: Console.url(path)

  def email_markdown(text), do: style_markdown(markdown(text))

  def markdown(text) do
    MDEx.to_html(
      text,
      extension: [
        strikethrough: true,
        tagfilter: true,
        table: true,
        autolink: true,
        tasklist: true,
        footnotes: true,
        shortcodes: true,
      ],
      parse: [
        smart: true,
        relaxed_tasklist_matching: true,
        relaxed_autolinks: true
      ],
      render: [
        github_pre_lang: true,
        escape: true
      ]
    )
  end
end
