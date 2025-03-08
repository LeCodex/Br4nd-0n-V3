FROM node:20-alpine AS base

WORKDIR /app

## BUILD
FROM base AS build

ADD package.json package-lock.json ./

# install dependencies
RUN npm ci

# Add project files
ADD . .

# build
RUN npm run build

# remove dev dependencies
RUN npm prune --omit=dev

## PROD
FROM base AS prod

# copy from build image
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/config ./config
COPY --from=build /app/dist ./dist

VOLUME /app/.data

# run it !
CMD [ "npm", "run", "start" ]
