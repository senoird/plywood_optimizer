# Stage 1: Use an official Nginx image as the base
# Using alpine variant for smaller image size
FROM nginx:1.25-alpine  # Using a specific version is good practice

# Optional: Add labels to describe the image
LABEL maintainer="Dean <your.email@example.com>"
LABEL description="Plywood Cut Optimizer static web application server"

# Remove the default Nginx welcome page / configuration if needed (often good practice)
# Although simply overwriting index.html usually suffices
# RUN rm /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html

# Copy the static web files from the build context (your project folder)
# into the directory Nginx serves files from (/usr/share/nginx/html/)
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/

# Expose port 80 (the default port Nginx listens on)
# This documents which port the container expects traffic on
EXPOSE 80

# The base Nginx image already has a command (CMD) to start Nginx
# in the foreground (`nginx -g 'daemon off;'`), so we don't need to add one here.
# It will automatically run when the container starts.