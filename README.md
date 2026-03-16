# @orca-pt/cli

Command-line interface for Orca project setup, authentication, agent inspection, and shipment workflows.

## Installation

Install globally:

```bash
npm install -g @orca-pt/cli
```

Run without installing:

```bash
npx @orca-pt/cli --help
```

Primary command is `orca`. A fallback alias `orcapt` is also available.

## Requirements

- Node.js 14+
- Docker (for `ship deploy`)
- Valid workspace token
- Access to an Orca API environment

## API Target Configuration

The CLI resolves API target in this order:

1. `ORCA_API_URL`
2. `ORCA_API_<ENV>_URL` (where `ENV` is `LOCAL`, `STAGE`, or `PROD`)
3. `ORCA_ENV` defaults (`local`, `stage`, `prod`)

Examples:

```bash
# One-off command
ORCA_API_URL="http://localhost:8081" orca login

# Session-wide
export ORCA_API_URL="http://localhost:8081"
orca login
```

## Authentication

```bash
orca login
orca status
orca logout
```

Login flow:

- Prompts for workspace and token
- Tries tenant auto-resolution using `tenant = workspace`
- If tenant resolution fails, prompts for tenant slug as fallback
- Saves credentials locally in `~/.orcapt/config.json`

## Command Reference

Use `orca --help` and `orca <command> --help` for full details.

### Core commands

- `orca login`
- `orca logout`
- `orca status`
- `orca fetch doc`
- `orca ui init|start|remove`

### Agent discovery

- `orca agents ls [--search <text>] [--per-page <number>]`
- `orca agent <name|slug|id>`

`orca agent` returns details such as type, endpoint, description, source, docs URL, and runtime flags.

### Project setup

- `orca kickstart python [options]`
- `orca kickstart node [options]`
- `orca kickstart go`

Common kickstart options:

```bash
--directory <name>
--port <frontend-port>
--agent-port <backend-port>
--no-start
```

### Shipment (Lambda and EC2)

`ship` is the shipment namespace.

Lambda deploy:

```bash
orca ship deploy <function-name> --image <registry/image:tag> [options]
```

Options:

```bash
--image <image>         # required
--memory <mb>           # default: 512
--timeout <seconds>     # default: 30
--env <key=value>       # repeatable
--env-file <path>
```

Lambda management under shipment namespace:

```bash
orca ship lambda list
orca ship lambda info <function-name>
orca ship lambda invoke <function-name> [--payload <json>] [--path <path>]
orca ship lambda logs <function-name> [--since <time>] [--page <n>] [--per-page <n>] [--tail]
orca ship lambda remove <function-name>
```

EC2/Hetzner deploy via runner:

```bash
orca ship ec2 deploy <app-name> --image <registry/image:tag> [options]
orca ship ec2 status <deployment-id>
orca ship ec2 logs <deployment-id> [--page <n>] [--per-page <n>]
```

EC2 deploy options:

```bash
--image <image>                 # required
--push                          # tag/push local image to Docker Hub first
--tag <tag>                     # custom tag when using --push
--container-name <name>
--port <host:container>         # repeatable
--env <key=value>               # repeatable
--env-file <path>
--command <command>
```

## Example: Deploy from a Dockerfile (Lambda)

From your project directory:

```bash
docker build -t my-agent:latest .
orca ship deploy my-agent-fn --image my-agent:latest
```

## Example: Deploy to EC2 runner

```bash
docker build -t my-agent:latest .
orca ship ec2 deploy my-agent --image my-agent:latest --port 80:3000
orca ship ec2 status <deployment-id>
orca ship ec2 logs <deployment-id>
```

## Notes

- Some legacy command groups are intentionally hidden from top-level help but may remain callable for compatibility.
- CLI route integrations are organized under `/api/v1/cli/*` in Orca API.

## Troubleshooting

- Verify API target:

```bash
echo $ORCA_API_URL
```

- Verify authentication:

```bash
orca status
```

- Ensure Docker is running before shipment:

```bash
docker ps
```

