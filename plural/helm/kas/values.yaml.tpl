consoleUrl: {{ .Configuration.console.console_dns }}

secrets:
  api: {{ dedupe . "kas.secrets.api" (randAlphaNum 64) }}
  private_api: {{ dedupe . "kas.secrets.private_api" (randAlphaNum 64) }}
  redis: {{ dedupe . "kas.secrets.redis" (randAlphaNum 64) }}

ingress:
  kas_dns: {{ .Values.kas_dns }}

redis:
  auth:
    password: {{ dedupe . "kas.redis.auth.password" (randAlphaNum 32) }}