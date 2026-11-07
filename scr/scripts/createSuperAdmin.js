const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const readline = require("readline");
const path = require("path");
const fs = require("fs");

const envPath = path.resolve(__dirname, "../.env");

require("dotenv").config({
  path: envPath,
  override: true,
});

console.log("ENVIRONMENT CHECK:", {
  envPath,
  envFileExists: fs.existsSync(envPath),
  hasMongoURI: Boolean(process.env.MONGO_URI),
  hasBootstrapDBName: Boolean(process.env.BOOTSTRAP_DB_NAME),
  hasJWTSecret: Boolean(process.env.JWT_SECRET),
});
const Admin = require("../models/Admin");

const ask = (question) =>
  new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });

    rl.on("error", reject);
  });

// Read passwords without displaying characters.
const askHidden = (question) =>
  new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      return reject(new Error("Run this script from an interactive terminal."));
    }

    let password = "";

    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const cleanup = () => {
      process.stdin.removeListener("data", handleInput);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };

    const handleInput = (key) => {
      for (const char of key) {
        if (char === "\u0003") {
          cleanup();
          return reject(new Error("Operation cancelled."));
        }

        if (char === "\r" || char === "\n") {
          cleanup();
          return resolve(password);
        }

        if (char === "\u007f" || char === "\b") {
          password = password.slice(0, -1);
          continue;
        }

        if (char >= " " && char !== "\u007f") {
          password += char;
        }
      }
    };

    process.stdin.on("data", handleInput);
  });

const validatePassword = (password) => {
  if (password.length < 12 || password.length > 128) {
    throw new Error("Password must contain between 12 and 128 characters.");
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error("Password must contain an uppercase letter.");
  }

  if (!/[a-z]/.test(password)) {
    throw new Error("Password must contain a lowercase letter.");
  }

  if (!/[0-9]/.test(password)) {
    throw new Error("Password must contain a number.");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must contain a special character.");
  }
};

const createSuperAdmin = async () => {
  let connected = false;

  try {
    console.log("\n=================================");
    console.log(" FIRST SUPER ADMIN BOOTSTRAP");
    console.log("=================================\n");

    // Prevent accidental execution in test mode.
    if (process.env.NODE_ENV === "test") {
      throw new Error("Bootstrap cannot run in test mode.");
    }

    const mongoURI = process.env.MONGO_URI;
    const expectedDatabase = process.env.BOOTSTRAP_DB_NAME;

    if (!mongoURI || !expectedDatabase) {
      throw new Error("MONGO_URI and BOOTSTRAP_DB_NAME must be configured.");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env.");
    }

    // Connect directly to the configured database.
    await mongoose.connect(mongoURI);
    connected = true;

    const actualDatabase = mongoose.connection.db.databaseName;

    console.log("Connected database:", actualDatabase);

    // Strict database identity check.
    if (actualDatabase !== expectedDatabase) {
      throw new Error(
        `DATABASE MISMATCH!\nExpected: ${expectedDatabase}\nConnected: ${actualDatabase}\nOperation aborted.`,
      );
    }

    console.log("\nDatabase identity verified.");

    // Require explicit confirmation.
    const confirmation = await ask(`Type "${actualDatabase}" to confirm: `);

    if (confirmation !== actualDatabase) {
      throw new Error("Database confirmation failed.");
    }

    // Refuse to create another super admin.
    const existingSuperAdmin = await Admin.findOne({
      role: "super_admin",
    });

    if (existingSuperAdmin) {
      throw new Error("A super admin already exists. Bootstrap is disabled.");
    }

    const fullName = await ask("Super admin full name: ");
    const email = (await ask("Super admin email: ")).toLowerCase();

    if (!fullName || !email) {
      throw new Error("Full name and email are required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      throw new Error("This email already belongs to an administrator.");
    }

    const password = await askHidden("Enter super admin password: ");

    const confirmPassword = await askHidden("Confirm super admin password: ");

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    validatePassword(password);

    // Hash password before saving.
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the first super admin.
    const admin = await Admin.create({
      fullName,
      email,
      password: hashedPassword,
      role: "super_admin",
      permissions: [],
      tokenVersion: 0,
      isActive: true,
    });

    console.log("\n=================================");
    console.log(" SUPER ADMIN CREATED SUCCESSFULLY");
    console.log("=================================");
    console.log("Name:", admin.fullName);
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
    console.log("Active:", admin.isActive);
    console.log("\nYou can now log in through your admin portal.");
    console.log("=================================\n");
  } catch (error) {
    console.error("\nBOOTSTRAP FAILED:");
    console.error(error.message);

    process.exitCode = 1;
  } finally {
    if (connected) {
      await mongoose.disconnect();
      console.log("MongoDB connection closed.");
    }
  }
};

createSuperAdmin();
