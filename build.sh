#!/bin/bash
set -e

# Configuration
IMAGE_NAME=istrih/bun-expo-updates-server
TAG=${TAG:-latest}
PLATFORMS="linux/amd64"

# Print colored output
print_info() {
    echo -e "\033[0;34m[INFO] $1\033[0m"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS] $1\033[0m"
}

print_error() {
    echo -e "\033[0;31m[ERROR] $1\033[0m"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Remind user about Docker Hub login
print_info "Building and pushing as istrih - make sure you've run 'docker login'"

# Set up Docker buildx
print_info "Setting up Docker buildx..."
if ! docker buildx ls | grep -q multiarch-builder; then
    print_info "Creating new buildx builder instance 'multiarch-builder'..."
    docker buildx create --name multiarch-builder --driver docker-container --bootstrap
fi
docker buildx use multiarch-builder
print_info "Bootstrapping buildx builder..."
docker buildx inspect --bootstrap

# Build and push multi-architecture images
print_info "Building and pushing Docker images for platforms: $PLATFORMS"
docker buildx build \
    --platform $PLATFORMS \
    --tag $IMAGE_NAME:$TAG \
    --push \
    --progress=plain \
    .

if [ $? -ne 0 ]; then
    print_error "Build failed! Check the errors above."
    exit 1
fi

# Verify the images
print_info "Verifying pushed images..."
docker buildx imagetools inspect $IMAGE_NAME:$TAG

print_success "Multi-architecture Docker images built and pushed successfully!"
print_success "Image: $IMAGE_NAME:$TAG"
print_success "Platforms: $PLATFORMS"

# Usage instructions
echo ""
echo "To pull the image:"
echo "  docker pull $IMAGE_NAME:$TAG"
echo ""
echo "To run the container:"
echo "  docker run -p 3000:3000 $IMAGE_NAME:$TAG"
