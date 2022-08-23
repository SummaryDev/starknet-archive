ARG NODE=node:16-alpine
FROM ${NODE} AS node

# First stage: compile things.
FROM node AS starknet-archive-builder
WORKDIR /usr/src/app

# (Install OS dependencies; include -dev packages if needed.)

# Install the Javascript dependencies, including all devDependencies.
COPY package.json .
RUN npm install

# Copy the rest of the application in and build it.
COPY . .
RUN npm run build
#CMD ["npm", "run", "build"]

# Now /usr/src/app/lib has the built files.

# Second stage: run things.
FROM node
WORKDIR /usr/src/app

# (Install OS dependencies; just libraries.)

# Install the Javascript dependencies, only runtime libraries.
COPY package.json .
RUN npm install --production

# Copy the dist tree from the first stage.
COPY --from=starknet-archive-builder /usr/src/app/lib lib

# Run the built application when the container starts.
CMD ["npm", "run", "start"]

