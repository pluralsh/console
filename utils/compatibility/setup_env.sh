#!/bin/bash

# This script sets up the Python environment for the update_ansible_version_matrix.py script.
# RUN: source scripts/setup_env.sh

# Exit immediately if a command exits with a non-zero status
set -e

# Check if pyenv is installed
if ! command -v pyenv &>/dev/null; then
    echo "pyenv could not be found, please install it first."
    return 1
fi

# Initialize pyenv
if command -v pyenv-init &>/dev/null; then
    eval "$(pyenv init --path)"
    eval "$(pyenv init -)"
fi

# Install the specified Python version using pyenv
pyenv install -s $(cat .python-version)

# Set the local Python version to the one specified
pyenv local $(cat .python-version)

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Install the required packages
pip install -r requirements.txt

echo "Python environment setup is complete and virtual environment is activated."
