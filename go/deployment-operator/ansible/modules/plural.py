#!/usr/bin/python

from ansible.module_utils.basic import AnsibleModule
import subprocess  # nosec B404 - required to invoke the plural CLI; shell=False, list args, validated below
import os
import base64
import stat
import tempfile

BOOTSTRAP = "bootstrap"
DELETE = "delete"
COMMANDS = (BOOTSTRAP, DELETE)


def run_module():
    module_args = dict(
        command=dict(type="str", required=True, choices=COMMANDS),

        # bootstrap args
        cluster_name=dict(type="str", required=False, default=None),
        handle=dict(type="str", required=False, default=None),
        values=dict(type="path", required=False, default=None),
        chart_loc=dict(type="str", required=False, default=None),
        project=dict(type="str", required=False, default=None),
        tags=dict(type="list", elements="str", required=False, default=None),
        metadata=dict(type="str", required=False, default=None),

        # delete args
        cluster_handle=dict(type="str", required=False, default=None),
        soft=dict(type="bool", required=False, default=False),

        # common - binary_content is injected by the action plugin
        binary_content=dict(type="str", required=False, no_log=False),
        kubeconfig=dict(type="path", default="/etc/kubernetes/admin.conf"),
        env_vars=dict(type="dict", required=False, default=None),
    )

    module = AnsibleModule(
        argument_spec=module_args,
        required_if=[
            ("command", BOOTSTRAP, ["cluster_name"]),
            ("command", DELETE,    ["cluster_handle"]),
        ],
    )

    command = module.params["command"]
    binary_content = module.params["binary_content"]
    kubeconfig = module.params["kubeconfig"]
    env_vars = module.params["env_vars"] or {}

    result = {"changed": False}

    # write binary to a temp file on the remote
    tmp_binary = None
    tmp_metadata = None
    try:
        fd, tmp_binary = tempfile.mkstemp(prefix="plural_")
        with os.fdopen(fd, "wb") as f:
            f.write(base64.b64decode(binary_content))
        os.chmod(tmp_binary, stat.S_IRWXU)

        metadata_content = module.params["metadata"]
        if metadata_content:
            fd2, tmp_metadata = tempfile.mkstemp(prefix="plural_metadata_", suffix=".yaml")
            with os.fdopen(fd2, "w") as f:
                f.write(metadata_content)

        env = os.environ.copy()
        env["KUBECONFIG"] = kubeconfig
        env["PLURAL_INSTALL_AGENT_CONFIRM_IF_EXISTS"] = "true"

        for key in ("PLURAL_CONSOLE_TOKEN", "PLURAL_CONSOLE_URL"):
            if key in env_vars:
                env[key] = env_vars[key]
            elif key in os.environ:
                env[key] = os.environ[key]

        if command == BOOTSTRAP:
            cmd = _build_bootstrap_cmd(module, tmp_binary, tmp_metadata)
        else:
            cmd = _build_delete_cmd(module, tmp_binary)

        proc = subprocess.run(cmd, capture_output=True, text=True, env=env)

        if proc.returncode != 0:
            module.fail_json(msg=proc.stderr, stdout=proc.stdout)

        result["changed"] = True
        result["stdout"] = proc.stdout

    finally:
        if tmp_binary and os.path.exists(tmp_binary):
            os.remove(tmp_binary)
        if tmp_metadata and os.path.exists(tmp_metadata):
            os.remove(tmp_metadata)

    module.exit_json(**result)


def _safe_arg(module, value, param_name):
    # Reject values that look like CLI flags to prevent argument injection
    # into the underlying binary (CWE-78 style attacks via subprocess args).
    if value and str(value).startswith("-"):
        module.fail_json(msg="Invalid value for %s: must not start with '-'" % param_name)
    return value


def _build_bootstrap_cmd(module, binary, metadata_path=None):
    cmd = [
        binary,
        "cd", "clusters", "bootstrap",
        "--name", _safe_arg(module, module.params["cluster_name"], "cluster_name"),
    ]

    if module.params["handle"]:
        cmd += ["--handle", _safe_arg(module, module.params["handle"], "handle")]

    if module.params["values"]:
        cmd += ["--values", _safe_arg(module, module.params["values"], "values")]

    if module.params["chart_loc"]:
        cmd += ["--chart-loc", _safe_arg(module, module.params["chart_loc"], "chart_loc")]

    if module.params["project"]:
        cmd += ["--project", _safe_arg(module, module.params["project"], "project")]

    for tag in (module.params["tags"] or []):
        cmd += ["--tag", _safe_arg(module, tag, "tags")]

    if metadata_path:
        cmd += ["--metadata", metadata_path]

    return cmd


def _build_delete_cmd(module, binary):
    cmd = [
        binary,
        "cd", "clusters", "delete",
        _safe_arg(module, module.params["cluster_handle"], "cluster_handle"),
    ]

    if module.params["soft"]:
        cmd.append("--soft")

    return cmd


def main():
    run_module()


if __name__ == "__main__":
    main()

