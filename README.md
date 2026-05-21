# property-sewa

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Express, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Express** - Fast, unopinionated web framework
- **tRPC** - End-to-end type-safe APIs
- **Node.js** - Runtime environment
- **Prisma** - TypeScript-first ORM
- **MongoDB** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```
## Database Setup

This project uses MongoDB with Prisma ORM.

1. Make sure you have MongoDB set up.
2. Update your `apps/server/.env` file with your MongoDB connection URI.

3. Generate the Prisma client and push the schema:
```bash
pnpm run db:push
```


Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).







## Project Structure

```
property-sewa/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   └── server/      # Backend API (Express, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:studio`: Open database studio UI
- `pnpm run check`: Run Biome formatting and linting

## Production Env Template (Backend)

Use placeholder values and set real secrets in your hosting platform environment settings.

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
CORS_ORIGIN=<your-frontend-origin>
COOKIE_DOMAIN=<your-cookie-domain>

# Redis (production: use managed Redis with TLS, e.g. rediss://...)
REDIS_URL=<your-redis-url>
PROPERTY_CACHE_TTL_SECONDS=60
PROPERTY_CACHE_NAMESPACE=property:v1
RECENTLY_VIEWED_MAX_ITEMS=10
RECENTLY_VIEWED_TTL_SECONDS=2592000

# Rate limiting
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900
RATE_LIMIT_LOGIN_MAX_REQUESTS=10
RATE_LIMIT_REGISTER_WINDOW_SECONDS=3600
RATE_LIMIT_REGISTER_MAX_REQUESTS=5
RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS=3600
RATE_LIMIT_FORGOT_PASSWORD_MAX_REQUESTS=5
RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS=3600
RATE_LIMIT_RESET_PASSWORD_MAX_REQUESTS=10
RATE_LIMIT_CONTACT_WINDOW_SECONDS=3600
RATE_LIMIT_CONTACT_MAX_REQUESTS=20
RATE_LIMIT_INQUIRY_WINDOW_SECONDS=3600
RATE_LIMIT_INQUIRY_MAX_REQUESTS=30
```

For local development, Redis can run in Docker (`redis://localhost:6379`).  
For production, use a managed provider such as Upstash Redis, Redis Cloud, or Render Redis.
