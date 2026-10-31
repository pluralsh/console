defmodule Console.Email.Preview do
  @moduledoc """
  Renders every transactional email against fixture data, without touching the database or smtp
  settings.  Used by `mix console.email.preview` to export html for client testing, and by the
  email rendering tests.

  Each template is rendered in a few variants:

  * `sample` - realistic data
  * `long` - very long names, urls and code to check wrapping and overflow
  * `missing` - nil values, as if the app data never got filled in
  * `placeholder` - bracketed placeholders left in the data
  """
  alias Console.Schema.{User, SharedSecret, AppNotification}
  import ConsoleWeb.EmailComponents

  @long_name "a-really-long-instance-name-that-keeps-going-and-going-past-sixty-chars"
  @long_url "https://console.some-very-long-subdomain.with-many-parts.example-enterprise-customer.com/cd/clusters/#{@long_name}/services"

  @type preview :: %{name: binary, subject: binary, html: binary, text: binary}

  @spec all() :: [preview]
  def all() do
    for {template, label} <- templates(),
        variant <- variants(),
        do: render(template, label, variant)
  end

  @spec variants() :: [atom]
  def variants(), do: ~w(sample long missing placeholder)a

  @spec render(atom, binary, atom) :: preview
  def render(:components, label, variant) do
    inner = components(variant)
    %{
      name: "components-#{variant}",
      subject: "[Preview] components (#{variant})",
      html: layout("email.html", label, inner),
      text: layout("email.text", label, "Component gallery, see the html version.")
    }
  end

  def render(template, label, variant) do
    assigns = Map.merge(%{label: label}, fixture(template, variant))
    %{
      name: "#{template}-#{variant}",
      subject: "[Preview] #{template} (#{variant})",
      html: view("#{template}.html", assigns, "email.html"),
      text: view("#{template}.text", assigns, "email.text")
    }
  end

  @spec export(binary) :: [binary]
  def export(dir) do
    File.mkdir_p!(dir)

    Enum.flat_map(all(), fn %{name: name, html: html, text: text} ->
      html_path = Path.join(dir, "#{name}.html")
      text_path = Path.join(dir, "#{name}.txt")
      File.write!(html_path, html)
      File.write!(text_path, text)
      [html_path, text_path]
    end)
  end

  defp templates() do
    [
      notification: "Notification",
      digest: "Activity",
      secret: "Shared secret",
      components: "Step 2 / 4"
    ]
  end

  defp view(template, assigns, layout) do
    Phoenix.View.render_to_string(ConsoleWeb.EmailView, template, Map.put(assigns, :layout, {ConsoleWeb.LayoutView, layout}))
  end

  defp layout(template, label, inner) do
    Phoenix.View.render_to_string(ConsoleWeb.LayoutView, template, %{label: label, inner_content: inner})
  end

  defp fixture(:notification, :sample) do
    %{notification: %AppNotification{text: """
      Service **api** failed to sync on cluster `prod-us-east-1`

      The last commit [3f2a9c1](https://github.com/pluralsh/example/commit/3f2a9c1) could not be applied:

      ```
      error: deployments.apps "api" is invalid: spec.replicas: Invalid value: -1
      ```

      * Check the service logs
      * Roll back to the previous revision
      """}}
  end
  defp fixture(:notification, :long) do
    %{notification: %AppNotification{text: """
      Service **#{@long_name}** failed on cluster `#{@long_name}`

      See #{@long_url} for details.

      ```
      #{String.duplicate("very-long-unbroken-log-line-", 12)}
      ```
      """}}
  end
  defp fixture(:notification, :missing), do: %{notification: %AppNotification{text: ""}}
  defp fixture(:notification, :placeholder), do: %{notification: %AppNotification{text: "[NOTIFICATION TEXT]"}}

  defp fixture(:digest, :sample), do: %{count: 5}
  defp fixture(:digest, :long), do: %{count: 1_234_567}
  defp fixture(:digest, :missing), do: %{count: nil}
  defp fixture(:digest, :placeholder), do: %{count: "[COUNT]"}

  defp fixture(:secret, :sample), do: secret("Jane Doe", "prod-db-password", "a1b2c3")
  defp fixture(:secret, :long), do: secret(String.duplicate("Bartholomew ", 6), @long_name, String.duplicate("h", 64))
  defp fixture(:secret, :missing), do: secret(nil, nil, nil)
  defp fixture(:secret, :placeholder), do: secret("[USER NAME]", "[SECRET NAME]", "[HANDLE]")

  defp secret(user, name, handle),
    do: %{user: %User{name: user}, share: %SharedSecret{name: name, handle: handle}}

  defp components(variant) do
    {instance, cluster, url, date} = component_values(variant)

    {:safe, [
      safe(card do
        {:safe, [
          safe(h1(do: "#{instance} is ready. Log in.")),
          safe(detail_row([
            %{label: "Instance", value: instance},
            %{label: "Cluster", value: cluster, mono: true},
            %{label: "Status", value: "Healthy", color: email_color(:success)}
          ])),
          safe(detail_stack([
            %{label: "Console URL", value: url, mono: true},
            %{label: "Log in as", value: "you@company.com", hint: "Same password or SSO you signed up with"}
          ])),
          safe(label(do: "Next, in the console")),
          safe(p(do: {:safe, ["Run ", safe(code(do: "plural up --cloud")), " to create your first cluster. Read the ", safe(a([href: url], do: "docs")), "."]})),
          safe(callout([label: "What happens next"], do: "If the retry works, you'll get the console is ready email.")),
          safe(footnote(do: "Your trial ends #{date}. Manage billing in the Plural app."))
        ]}
      end),
      safe(cta([href: url], do: "Open console"))
    ]}
  end

  defp component_values(:sample), do: {"acme", "prod-us-east-1", "https://acme.cloud.plural.sh", "Nov 30, 2026"}
  defp component_values(:long), do: {@long_name, @long_name, @long_url, "Wednesday, November 30, 2026"}
  defp component_values(:missing), do: {nil, nil, "", nil}
  defp component_values(:placeholder), do: {"[INSTANCE]", "[cluster-name]", "https://[INSTANCE].[CONSOLE DOMAIN]", "[TRIAL END DATE]"}

  defp safe({:safe, iodata}), do: iodata
end
