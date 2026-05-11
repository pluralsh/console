from __future__ import annotations

import base64
import os

from ansible.plugins.action import ActionBase


class ActionModule(ActionBase):
    """Action plugin for the plural module.

    Runs on the controller: reads the local plural binary, base64-encodes it,
    injects it as `binary_content`, then delegates actual execution to the
    normal module on the remote host.
    """

    TRANSFERS_FILES = False

    def run(self, tmp=None, task_vars=None):
        result = super().run(tmp, task_vars)
        task_vars = task_vars or {}

        module_args = self._task.args.copy()

        local_binary = module_args.pop("local_binary", "/usr/local/bin/plural")

        try:
            with open(local_binary, "rb") as f:
                binary_content = base64.b64encode(f.read()).decode("utf-8")
        except OSError as e:
            return dict(failed=True, msg=f"Cannot read local binary '{local_binary}': {e}")

        module_args["binary_content"] = binary_content

        # inject console credentials from the controller environment
        env_vars = module_args.get("env_vars") or {}
        for key in ("PLURAL_CONSOLE_TOKEN", "PLURAL_CONSOLE_URL"):
            if key not in env_vars and key in os.environ:
                env_vars[key] = os.environ[key]
        module_args["env_vars"] = env_vars

        result.update(
            self._execute_module(
                module_name="plural",
                module_args=module_args,
                task_vars=task_vars,
                tmp=tmp,
            )
        )
        return result

