# ---- build stage ----
FROM node:24-alpine AS build
WORKDIR /app

# Corepack ships with Node and pins pnpm to the exact version the lockfile
# was generated with, so the build is reproducible regardless of what's
# preinstalled on the CapRover host's builder.
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---- serve stage ----
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
