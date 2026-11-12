import { defineConfig } from "@neon/config/v1"

export default defineConfig({
  auth: false,
  buckets: {
    vboard: {},
  },
  branch: (branch) => {
    if (branch.isDefault || branch.exists) return {}
    return { ttl: "7d" }
  },
})
