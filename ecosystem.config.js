module.exports = {
    apps: [
      {
        name: "api-server",
        script: "dist/server.js",
        instances: 1,
        exec_mode: "fork",
        env: {
          NODE_ENV: "production",
          PORT: 4000
        }
      }
    ]
  }
  