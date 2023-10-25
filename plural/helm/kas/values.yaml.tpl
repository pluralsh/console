secrets:
  api: {{ dedupe . "kas.secrets.api" (randAlphaNum 64) }}
  private_api: {{ dedupe . "kas.secrets.private_api" (randAlphaNum 64) }}
  redis: {{ dedupe . "kas.secrets.redis" (randAlphaNum 64) }}

