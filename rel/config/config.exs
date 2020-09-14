import Config
import System, only: [get_env: 1]

config :arc,
  storage: Arc.Storage.GCS,
  bucket: get_env("GCS_BUCKET")

config :piazza_core, aes_key: get_env("AES_KEY")