#!/bin/bash

set -e # Exit on error

# Color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
# Rag Node Dir 
PNPM_PREFIX=$(npm prefix -g)
RAG_NODE_DIR="$PNPM_PREFIX/lib/node_modules/rag-node"

print_message() { echo -e "${CYAN}$1${NC}"; }
print_success() { echo -e "${GREEN}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
    print_message "Detected macOS system"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
    print_message "Detected Linux system"
else
    print_error "Unsupported operating system: $OSTYPE"
    exit 1
fi

print_message "Starting Godspeed RAG MCP Installation..."

# Homebrew for macOS
if [[ "$OS_TYPE" == "macos" ]]; then
    print_message "Checking for Homebrew..."
    if ! command -v brew &> /dev/null; then
        print_message "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        print_message "Homebrew is already installed. Updating..."
        brew update
    fi
fi

# Setup NVM
print_message "Setting up NVM (Node Version Manager)..."

if ! command -v nvm &> /dev/null; then
    if [[ "$OS_TYPE" == "macos" ]]; then
        brew install nvm
        mkdir -p ~/.nvm
        if ! grep -q "NVM_DIR" ~/.zshrc; then
            echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
            echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
            echo '[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"' >> ~/.zshrc
        fi
    else
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
fi

# Load NVM for this session
export NVM_DIR="$HOME/.nvm"

if [[ "$OS_TYPE" == "macos" ]]; then
    NVM_SH="/opt/homebrew/opt/nvm/nvm.sh"
else
    NVM_SH="$NVM_DIR/nvm.sh"
fi

if [[ -s "$NVM_SH" ]]; then
    \. "$NVM_SH"
else
    print_error "Failed to load NVM. Please restart your terminal and try again."
    exit 1
fi

# Verify NVM
if ! command -v nvm &> /dev/null; then
    print_error "NVM still not detected after loading. Please restart your terminal and rerun the script."
    exit 1
fi

print_success "NVM loaded successfully."

# Install Node.js
print_message "Installing Node.js LTS via NVM..."
nvm install --lts
nvm use --lts

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js installation failed."
    exit 1
fi

print_success "Node.js version: $(node -v)"
print_success "npm version: $(npm -v)"

# rag-node Installation and .env Setup
print_message "Installing rag-node..."
npm install -g @godspeedsystems/rag-node

# Locate global installation directory
print_message "Locating global rag-node installation directory..."

#Adding path to RC file 
if [ "$OSTYPE" = "macos" ]; then
    if ! grep -q "RAG_NODE_DIR" "$HOME/.zshrc"; then
        echo 'export RAG_NODE_DIR="$RAG_NODE_DIR"' >> "$HOME/.zshrc"
        echo "RAG_NODE_DIR added to .zshrc"
    else
        echo "RAG_NODE_DIR already present in .zshrc"
    fi
elif [ "$OSTYPE" = "linux" ]; then
    if ! grep -q "RAG_NODE_DIR" "$HOME/.bashrc"; then
        echo 'export RAG_NODE_DIR="$RAG_NODE_DIR"' >> "$HOME/.bashrc"
        echo "RAG_NODE_DIR added to .bashrc"
    else
        echo "RAG_NODE_DIR already present in .bashrc"
    fi
fi


if [[ ! -d "$RAG_NODE_DIR" ]]; then
    print_error "rag-node installation directory not found at $RAG_NODE_DIR"
    exit 1
fi

# Prompt user for GOOGLE_API_KEY with masking
print_message ""
print_message "Enter your GOOGLE_API_KEY for rag-node."
print_warning "Note: This key will NOT be stored or sent to any server. It will only be written to a local .env file."

# Prompt silently
read -rs -p "GOOGLE_API_KEY: " GOOGLE_API_KEY
echo ""

# Write to .env file in the rag-node directory
ENV_FILE="$RAG_NODE_DIR/.env"
echo "GOOGLE_API_KEY=$GOOGLE_API_KEY" > "$ENV_FILE"
print_success "Successfully configured API Key"


print_success "Godspeed CLI version: $(godspeed --version)"
print_success "Installation complete! Please restart your terminal for all changes to apply."
