module.exports = {
  schema: "./schema.public.graphql",
  documents: "./src/**/*.graphql",
  extensions: {
    endpoints: {
      default: {
        url: "https://api.github.com/graphql",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${process.env.GITHUB_USERNAME}:${process.env.GITHUB_PAT}`).toString('base64')}`
        }
      }
    }
  }
}
