defmodule ConsoleWeb.Plugs.RemoteIp do
  alias RemoteIp
  alias RemoteIp.Headers

  def init(opts), do: RemoteIp.init(opts)

  def call(%{req_headers: headers} = conn, opts) do
    headers = Headers.take(headers, opts[:headers])
    ips     = Headers.parse(headers, opts[:parsers])
              |> Enum.reverse()
    %{conn | remote_ip: find_ip(ips, conn.remote_ip)}
  end

  defp find_ip([_, ip | _], _), do: ip # assume spoof after 2 layers of proxy
  defp find_ip([ip], _), do: ip
  defp find_ip(_, ip), do: ip
end
