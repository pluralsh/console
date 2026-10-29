defmodule ConsoleWeb.EmailComponents do
  @moduledoc """
  Email-safe building blocks for the transactional email layout.  Everything renders
  as tables or simple block elements with inline styles, since Gmail strips most
  `<style>` blocks and Outlook ignores flexbox, gradients and border-radius.
  """
  import Phoenix.HTML, only: [html_escape: 1]

  @assets "https://app.plural.sh"

  @colors %{
    page: "#0e1015",
    band: "#171a21",
    card: "#21242c",
    cell: "#252932",
    code: "#2a2e37",
    divider: "#2a2e37",
    border: "#383d47",
    border_code: "#3d424d",
    text: "#eef0f1",
    text_light: "#c5c9d2",
    text_xlight: "#a1a5b0",
    accent: "#99daff",
    success: "#17e8a0",
    on_accent: "#0e1015"
  }

  @fonts %{
    sans: "Inter, Helvetica, Arial, sans-serif",
    mono: "'JetBrains Mono', Menlo, Consolas, monospace"
  }

  def email_asset(path), do: "#{@assets}/#{path}"

  def email_color(name), do: Map.fetch!(@colors, name)

  def email_font(name), do: {:safe, Map.fetch!(@fonts, name)}

  def card(do: block) do
    safe([
      ~s(<table role="presentation" class="px-card-bg" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#{@colors.card}" ),
      ~s(style="width:100%;background-color:#{@colors.card};border:1px solid #{@colors.border};border-collapse:separate;">),
      ~s(<tr><td class="px-card" style="padding:32px 28px;background-color:#{@colors.card};font-family:#{@fonts.sans};">),
      content(block),
      "</td></tr></table>"
    ])
  end

  def h1(do: block) do
    safe([
      ~s(<h1 class="px-h1 px-text" style="margin:0 0 20px;font-family:#{@fonts.mono};font-size:26px;line-height:34px;),
      ~s(font-weight:500;color:#{@colors.text};word-break:break-word;overflow-wrap:break-word;">),
      content(block),
      "</h1>"
    ])
  end

  def p(do: block) do
    safe([
      ~s(<p class="px-text-light" style="#{style(:p)}">),
      content(block),
      "</p>"
    ])
  end

  def label(do: block) do
    safe([~s(<p class="px-accent" style="#{style(:label)}">), content(block), "</p>"])
  end

  def a(attrs, do: block) do
    safe([
      ~s(<a class="px-link" href="), escape(Keyword.fetch!(attrs, :href)),
      ~s(" target="_blank" style="#{style(:a)}">),
      content(block),
      "</a>"
    ])
  end

  def code(do: block), do: safe([~s(<code style="#{style(:code)}">), content(block), "</code>"])

  def footnote(do: block) do
    safe([
      ~s(<p class="px-text-xlight" style="margin:0;padding:16px 0 0;border-top:1px solid #{@colors.border};),
      ~s(font-family:#{@fonts.sans};font-size:13px;line-height:20px;color:#{@colors.text_xlight};">),
      content(block),
      "</p>"
    ])
  end

  def callout(attrs, do: block) do
    spaced([
      ~s(<table role="presentation" class="px-cell" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#{@colors.cell}" ),
      ~s(style="width:100%;background-color:#{@colors.cell};border:1px solid #{@colors.border};border-collapse:separate;">),
      ~s(<tr><td style="padding:16px;">),
      ~s(<p class="px-accent" style="#{style(:detail_label)}margin:0 0 8px;">), escape(Keyword.fetch!(attrs, :label)), "</p>",
      ~s(<p class="px-text" style="margin:0;font-family:#{@fonts.sans};font-size:15px;line-height:24px;color:#{@colors.text};">),
      content(block),
      "</p></td></tr></table>"
    ])
  end

  @doc """
  Detail cells side by side, eg Instance / Plan / Hosting.  Cells stack on narrow screens.
  Each item is a map with `:label` and `:value`, and optionally `:mono` and `:color`.
  """
  def detail_row(items) do
    count = length(items)
    width = div(100, max(count, 1))

    cells =
      items
      |> Enum.with_index()
      |> Enum.map(fn {item, i} ->
        divider = if i > 0, do: " px-stack-divider", else: ""
        border = if i < count - 1, do: "border-right:1px solid #{@colors.border};", else: ""

        [
          ~s(<td class="px-stack#{divider}" width="#{width}%" valign="top" style="width:#{width}%;padding:14px 16px;#{border}vertical-align:top;">),
          detail_body(item),
          "</td>"
        ]
      end)

    spaced([
      ~s(<table role="presentation" class="px-cell" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#{@colors.cell}" ),
      ~s(style="width:100%;table-layout:fixed;background-color:#{@colors.cell};border:1px solid #{@colors.border};border-collapse:separate;">),
      "<tr>", cells, "</tr></table>"
    ])
  end

  @doc """
  Detail cells stacked vertically, eg Console URL / Log in as.  Items accept an optional `:hint`.
  """
  def detail_stack(items) do
    count = length(items)

    rows =
      items
      |> Enum.with_index()
      |> Enum.map(fn {item, i} ->
        border = if i < count - 1, do: "border-bottom:1px solid #{@colors.border};", else: ""

        [
          ~s(<tr><td style="padding:14px 16px;#{border}">),
          detail_body(item),
          hint(item),
          "</td></tr>"
        ]
      end)

    spaced([
      ~s(<table role="presentation" class="px-cell" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#{@colors.cell}" ),
      ~s(style="width:100%;table-layout:fixed;background-color:#{@colors.cell};border:1px solid #{@colors.border};border-collapse:separate;">),
      rows,
      "</table>"
    ])
  end

  @doc """
  Bulletproof pill button.  Outlook on Windows gets a VML roundrect, everything else an
  inline-block link.  VML needs a fixed width, so it is estimated from the label length
  unless `:width` is given.
  """
  def cta(attrs, do: block) do
    href = escape(Keyword.fetch!(attrs, :href))
    text = content(block)
    width = Keyword.get_lazy(attrs, :width, fn -> vml_width(text) end)

    safe([
      ~s(<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">),
      ~s(<tr><td align="left" style="padding:20px 0 0;">),
      ~s(<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="), href,
      ~s(" style="height:44px;v-text-anchor:middle;width:#{width}px;" arcsize="50%" stroke="f" fillcolor="#{@colors.accent}"><w:anchorlock/>),
      ~s(<center style="color:#{@colors.on_accent};font-family:Consolas,monospace;font-size:15px;font-weight:500;">), text, " &rarr;</center>",
      "</v:roundrect><![endif]-->",
      "<!--[if !mso]><!-- -->",
      ~s(<a class="px-cta px-cta-bg" href="), href,
      ~s(" target="_blank" style="display:inline-block;background-color:#{@colors.accent};color:#{@colors.on_accent};border-radius:999px;),
      ~s(padding:12px 24px;font-family:#{@fonts.mono};font-size:15px;line-height:20px;font-weight:500;text-decoration:none;mso-hide:all;">),
      text, " &rarr;</a>",
      "<!--<![endif]-->",
      "</td></tr></table>"
    ])
  end

  @markdown_tags ~w(p a ul ol li h1 h2 h3 h4 h5 h6 blockquote table th td hr)

  @doc """
  Inlines styles onto rendered markdown html, since there's no reliable stylesheet support in email.
  """
  def style_markdown(html) when is_binary(html) do
    html
    |> then(&Regex.replace(~r/<pre[^>]*>\s*<code[^>]*>/, &1, ~s(<pre style="#{style(:pre)}"><code style="font-family:#{@fonts.mono};">)))
    |> then(&Regex.replace(~r/<code>/, &1, ~s(<code style="#{style(:code)}">)))
    |> then(&Regex.replace(~r/<(#{Enum.join(@markdown_tags, "|")})(\s|>)/, &1, fn _, tag, rest ->
      ~s(<#{tag}#{markdown_class(tag)} style="#{style(markdown_style(tag))}"#{rest})
    end))
    |> then(&{:safe, &1})
  end

  defp detail_body(item) do
    [
      ~s(<p class="px-accent" style="#{style(:detail_label)}margin:0 0 6px;">), escape(item[:label]), "</p>",
      ~s(<p class="px-text" style="#{value_style(item)}">), escape(item[:value]), "</p>"
    ]
  end

  defp hint(%{hint: hint}) when is_binary(hint) do
    [
      ~s(<p class="px-text-xlight" style="margin:4px 0 0;font-family:#{@fonts.sans};font-size:13px;line-height:18px;color:#{@colors.text_xlight};">),
      escape(hint),
      "</p>"
    ]
  end
  defp hint(_), do: []

  defp value_style(%{mono: true} = item) do
    "margin:0;font-family:#{@fonts.mono};font-size:13px;line-height:20px;color:#{item[:color] || @colors.text};" <>
      "word-break:break-all;overflow-wrap:anywhere;"
  end
  defp value_style(item) do
    "margin:0;font-family:#{@fonts.sans};font-size:15px;line-height:20px;font-weight:600;color:#{item[:color] || @colors.text};" <>
      "word-break:break-word;overflow-wrap:anywhere;"
  end

  defp style(:p), do: "margin:0 0 20px;font-family:#{@fonts.sans};font-size:15px;line-height:24px;color:#{@colors.text_light};word-break:break-word;"
  defp style(:label), do: "#{style(:detail_label)}font-size:12px;line-height:16px;margin:0 0 8px;"
  defp style(:detail_label), do: "font-family:#{@fonts.mono};font-size:11px;line-height:14px;letter-spacing:1px;text-transform:uppercase;color:#{@colors.accent};"
  defp style(:a), do: "color:#{@colors.accent};text-decoration:underline;word-break:break-all;"
  defp style(:code) do
    "font-family:#{@fonts.mono};font-size:13px;background-color:#{@colors.code};border:1px solid #{@colors.border_code};" <>
      "padding:1px 6px;color:#{@colors.text};"
  end
  defp style(:pre) do
    "margin:0 0 20px;padding:12px 16px;font-family:#{@fonts.mono};font-size:13px;line-height:20px;color:#{@colors.text};" <>
      "background-color:#{@colors.code};border:1px solid #{@colors.border_code};white-space:pre-wrap;word-break:break-all;"
  end
  defp style(:list), do: "margin:0 0 20px;padding:0 0 0 20px;font-family:#{@fonts.sans};font-size:15px;line-height:24px;color:#{@colors.text_light};"
  defp style(:li), do: "margin:0 0 4px;"
  defp style(:heading), do: "margin:0 0 12px;font-family:#{@fonts.mono};font-size:17px;line-height:24px;font-weight:500;color:#{@colors.text};"
  defp style(:blockquote), do: "margin:0 0 20px;padding:0 0 0 12px;border-left:2px solid #{@colors.border};color:#{@colors.text_xlight};"
  defp style(:table), do: "margin:0 0 20px;border-collapse:collapse;font-family:#{@fonts.sans};font-size:13px;line-height:20px;color:#{@colors.text_light};"
  defp style(:cell), do: "padding:6px 8px;border:1px solid #{@colors.border};text-align:left;"
  defp style(:hr), do: "margin:0 0 20px;border:0;border-top:1px solid #{@colors.border};"

  defp markdown_style("p"), do: :p
  defp markdown_style("a"), do: :a
  defp markdown_style(tag) when tag in ~w(ul ol), do: :list
  defp markdown_style("li"), do: :li
  defp markdown_style("blockquote"), do: :blockquote
  defp markdown_style("table"), do: :table
  defp markdown_style(tag) when tag in ~w(th td), do: :cell
  defp markdown_style("hr"), do: :hr
  defp markdown_style(_heading), do: :heading

  defp markdown_class("a"), do: ~s( class="px-link")
  defp markdown_class("p"), do: ~s( class="px-text-light")
  defp markdown_class(_), do: ""

  defp vml_width(text) do
    chars =
      text
      |> IO.iodata_to_binary()
      |> then(&Regex.replace(~r/<[^>]*>/, &1, ""))
      |> then(&Regex.replace(~r/&[#a-z0-9]+;/i, &1, "x"))
      |> String.trim()
      |> String.length()

    (chars + 2) * 9 + 48
  end

  defp spaced(inner) do
    safe([
      ~s(<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">),
      ~s(<tr><td style="padding:0 0 20px;">),
      inner,
      "</td></tr></table>"
    ])
  end

  defp content({:safe, iodata}), do: iodata
  defp content(other), do: escape(other)

  defp escape(nil), do: ""
  defp escape(value) do
    {:safe, iodata} = html_escape(value)
    iodata
  end

  defp safe(iodata), do: {:safe, iodata}
end
