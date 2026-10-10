#!/usr/bin/env bash
# Run manually on a new Ubuntu LTS EC2 instance after reviewing it.
set -euo pipefail
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sudo sh /tmp/get-docker.sh
sudo usermod -aG docker "$USER"
echo "Docker installed. Log out and back in before running deployment scripts."
