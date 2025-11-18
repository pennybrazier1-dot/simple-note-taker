# CodeSpring Notes

A simple, secure note-taking application built with Next.js 14, featuring rich text editing, category management, and real-time synchronization.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Getting Started](#getting-started)
5. [Project Structure](#project-structure)
6. [Development](#development)
7. [Deployment](#deployment)
8. [Security](#security)
9. [Troubleshooting](#troubleshooting)

---

## ✨ Features

- 📝 **Rich Text Editor** - Create and edit notes with formatting (bold, italic, lists, headings)
- 🔄 **Auto-save** - Changes are automatically saved as you type
- 📁 **Category Management** - Organize notes with custom categories
- 🔍 **Search & Filter** - Quickly find notes by title, content, or category
- 📌 **Pin & Archive** - Organize important notes with pinning and archiving
- ⚡ **Real-time Updates** - See changes across tabs instantly
- 🔐 **Secure** - User-scoped data with Clerk authentication
- 📱 **Responsive** - Works beautifully on desktop and mobile

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router, React Server Components) |
| **Styling** | Tailwind CSS, ShadCN UI, Framer Motion |
| **Editor** | Tiptap (Rich Text Editor) |
| **Backend** | Supabase (PostgreSQL) with Drizzle ORM |
| **Auth** | Clerk |
| **Deployment** | Vercel |

---

## 📦 Prerequisites

Before you begin, make sure you have:

1. **Node.js ≥ 18**
   - Recommended: install via [nvm](https://github.com/nvm-sh/nvm)
2. **Git** and a **GitHub** account
3. **Supabase** account ([free tier](https://supabase.com) is fine)
4. **Clerk** account ([free tier](https://clerk.com) is fine)
5. **Vercel** account ([free tier](https://vercel.com) is fine)

> 💡 All listed services have free plans – you can build and test without spending a cent.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/pennybrazier1-dot/codespring-notes.git
cd codespring-notes
```

### 2. Install Dependencies

```bash
# Make sure you're using Node ≥ 18
node -v

# Install packages
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Open `.env.local` and add your configuration:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://<user>:<password>@db.<project>.supabase.co:6543/postgres"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# Optional: Supabase (for real-time features)
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

> ⚠️ **Important**: Never commit `.env.local` to Git! It's already in `.gitignore`.

### 4. Set Up Database

```bash
# Generate database migrations
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app.

---

## 📁 Project Structure

```
.
├── actions/              # Server actions (CRUD operations)
├── app/                  # Next.js app router
│   ├── (auth)/          # Authentication pages
│   ├── (dashboard)/     # Protected dashboard routes
│   └── api/             # API routes
├── components/           # React components
│   ├── ui/              # ShadCN UI components
│   ├── notes/           # Note-related components
│   └── categories/      # Category components
├── db/                   # Database configuration
│   ├── schema/          # Drizzle ORM schemas
│   ├── queries/          # Reusable database queries
│   └── migrations/      # Database migrations
├── lib/                  # Utility functions
├── prds/                 # Product Requirements Documents
└── types/                # TypeScript type definitions
```

---

## 💻 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Generate database migrations
npm run db:generate

# Run database migrations
npm run db:migrate

# Lint code
npm run lint
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following the project structure
   - Add tests if applicable
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: description of your changes"
   ```

4. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

---

## 🚢 Deployment

### Deploy to Vercel

1. **Push your code to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Add environment variables (same as `.env.local`)
   - Click "Deploy"

3. **Configure Domain** (Optional)
   - Add your custom domain in Vercel settings
   - SSL certificates are automatically provisioned

---

## 🔒 Security

### Environment Variables

- ✅ All `.env*` files are in `.gitignore`
- ✅ Never commit secrets to Git
- ✅ Use Vercel environment variables for production

### Authentication

- All routes are protected with Clerk middleware
- User data is scoped by `userId` in all queries
- Server Actions validate authentication before operations

### Database

- Row-level security (RLS) recommended in Supabase
- All queries filter by authenticated user
- Soft deletes prevent data loss

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `Module not found` | Delete `node_modules` and `package-lock.json`, then run `npm install` |
| Clerk auth fails | Verify your `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_` |
| Database connection error | Check `DATABASE_URL` format and Supabase connection settings |
| Migration errors | Ensure your database is accessible and migrations are up to date |
| Build errors | Run `npm run type-check` to identify TypeScript errors |

---

## 📚 Documentation

- [Product Requirements Documents](./prds/) - Detailed PRDs for all features
- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)

---

## 📝 License

Distributed under the MIT License. See [`LICENSE`](license) for more information.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📧 Support

If you get stuck or spot an issue, reach out at **usecodespring@gmail.com** – we're happy to help!

---

**Built with ❤️ using CodeSpring**
