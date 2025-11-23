FROM rust:1.91.1

# Install additional tools
RUN apt-get update && apt-get install -y \
    git \
    vim \
    zsh \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Copy and run common dependency installation script
COPY scripts/install-ubuntu-deps.sh /tmp/install-ubuntu-deps.sh
RUN chmod +x /tmp/install-ubuntu-deps.sh && \
    /tmp/install-ubuntu-deps.sh && \
    rm /tmp/install-ubuntu-deps.sh && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js (replace <NODEJS_VERSION> with LTS version like 22)
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs

# Install GitHub CLI
RUN type -p curl >/dev/null || (sudo apt update && sudo apt install curl -y) && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    sudo apt update && \
    sudo apt install gh -y

# Create a non-root user (replace existing node user)
RUN userdel -r node || true && \
    groupadd -g 1000 developer && \
    useradd -m -u 1000 -g 1000 -s /bin/zsh developer && \
    echo "developer ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set working directory
WORKDIR /projects

# Change ownership of projects directory to developer user
RUN chown -R developer:developer /projects

# Switch to non-root user
USER developer

# Install Rust components
RUN rustup component add clippy rustfmt

# Set up npm user-level directory
RUN mkdir -p /home/developer/.npm-global
RUN mkdir -p /home/developer/.local
RUN mkdir -p /home/developer/.config

# Set up shell environment with npm user prefix
ENV NPM_CONFIG_PREFIX=/home/developer/.npm-global
ENV PATH=$PATH:/home/developer/.local/bin:/home/developer/.npm-global/bin:/usr/local/bin

# Default command
CMD ["zsh"]

