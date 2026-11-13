defmodule Console.Email.PreviewTest do
  use ExUnit.Case, async: true
  import ConsoleWeb.EmailComponents
  alias Console.Email.Preview

  @gmail_clip_bytes 102 * 1024

  describe "rendered emails" do
    for %{name: name, html: html, text: text} <- Preview.all() do
      @html html
      @text text

      test "#{name} stays under gmail's clipping limit" do
        assert byte_size(@html) < @gmail_clip_bytes
      end

      test "#{name} avoids css that email clients drop" do
        refute @html =~ ~r/display:\s*(flex|grid)/
        refute @html =~ "linear-gradient"
        refute @html =~ "fonts.googleapis.com"
      end

      test "#{name} sets alt text on every image" do
        imgs = Regex.scan(~r/<img\b[^>]*>/, @html)
        assert length(imgs) > 0
        for [img] <- imgs, do: assert(img =~ ~r/\salt="/)
      end

      test "#{name} pairs every cta with an outlook vml fallback" do
        ctas = Regex.scan(~r/class="px-cta /, @html) |> length()
        vml = Regex.scan(~r/<v:roundrect/, @html) |> length()
        assert ctas == vml
      end

      test "#{name} has background colors behind images and a footer in the text version" do
        assert @html =~ ~s(bgcolor="#171a21" background=")
        assert @text =~ "1460 Broadway"
      end
    end
  end

  describe "components" do
    test "values are html escaped" do
      html = detail_row([%{label: "Cluster", value: "<script>alert(1)</script>"}]) |> Phoenix.HTML.safe_to_string()
      refute html =~ "<script>"
      assert html =~ "&lt;script&gt;"
    end

    test "detail rows split widths evenly and stack on mobile" do
      html =
        detail_row([%{label: "A", value: "1"}, %{label: "B", value: "2"}, %{label: "C", value: "3"}])
        |> Phoenix.HTML.safe_to_string()

      assert Regex.scan(~r/class="px-stack/, html) |> length() == 3
      assert Regex.scan(~r/width="33%"/, html) |> length() == 3
    end

    test "cta vml width grows with the label" do
      [_, short] = Regex.run(~r/width:(\d+)px/, Phoenix.HTML.safe_to_string(cta([href: "/"], do: "Login")))
      [_, long] = Regex.run(~r/width:(\d+)px/, Phoenix.HTML.safe_to_string(cta([href: "/"], do: "Login to the Plural Console to see more")))
      assert String.to_integer(long) > String.to_integer(short)
    end

    test "markdown gets inline styles" do
      {:safe, html} = style_markdown(~s(<p>hi <a href="https://x.com">x</a> <code>y</code></p><pre lang="sh"><code>z</code></pre>))
      assert html =~ ~s(<p class="px-text-light" style=")
      assert html =~ ~s(<a class="px-link" style=")
      assert html =~ ~s(<code style="font-family:)
      assert html =~ ~s(<pre style=")
    end
  end
end
