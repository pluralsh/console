defmodule Console.Cron do
  use Quantum.Scheduler,
    otp_app: :console
end
