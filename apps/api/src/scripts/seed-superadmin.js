// apps/api/src/scripts/seed-superadmin.js
const dotenv = require("dotenv")
dotenv.config()

const connectDB = require("../db/connectDB")
const { initSuperAdmin } = require("../modules/auth/auth.service")

const run = async () => {
  try {
    await connectDB()

    const name = process.env.SUPERADMIN_NAME || "Super Admin"
    const email = process.env.SUPERADMIN_EMAIL || "admin@system.com"
    const password = process.env.SUPERADMIN_PASSWORD || "admin123"
    const address = process.env.SUPERADMIN_ADDRESS || "Kathmandu"

    const admin = await initSuperAdmin({ name, email, password, address })

    console.log("Superadmin initialized:")
    console.log(`  id: ${admin.id}`)
    console.log(`  email: ${admin.email}`)
    console.log(`  role: ${admin.role}`)
  } catch (err) {
    console.error("Failed to seed superadmin:", err.message)
  } finally {
    process.exit(0)
  }
}

run()

