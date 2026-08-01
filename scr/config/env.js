const requiredEnv = ["PORT", "MONGO_URI", "JWT_SECRET"];

requiredEnv.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
});
