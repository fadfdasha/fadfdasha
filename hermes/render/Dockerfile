# Official Hermes Agent image. Preserve its /init and s6-overlay supervisor.
# Source: https://hermes-agent.nousresearch.com/docs/user-guide/docker
# For production reproducibility, replace :stable with an audited immutable digest.
FROM nousresearch/hermes-agent:stable

# The official entrypoint handles config migration and supervises the gateway.
# Render attaches a persistent disk at /opt/data; do not write secrets here.
CMD ["gateway", "run"]
