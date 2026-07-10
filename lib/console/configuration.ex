defmodule Console.Configuration do
  defstruct [:git_commit, :is_demo_project, :is_sandbox, :plural_login, :vpn_enabled, :features, :sentry_enabled, :details]

  defmodule Details do
    defstruct [:assume_role_arn, :egress_ips]

    def new(%{} = attrs) do
      %__MODULE__{
        assume_role_arn: attrs["assume_role_arn"],
        egress_ips: attrs["egress_ips"],
      }
    end
  end

  def new() do
    %__MODULE__{
      git_commit: Console.conf(:git_commit),
      is_demo_project: Console.conf(:is_demo_project),
      is_sandbox: Console.sandbox?(),
      plural_login: Console.conf(:plural_login),
      vpn_enabled: Console.Services.VPN.enabled?(),
      features: Console.Features.fetch(),
      sentry_enabled: !!Application.get_env(:sentry, :dsn),
      details: Details.new(Application.get_env(:console, :details) || %{}),
    }
  end
end
