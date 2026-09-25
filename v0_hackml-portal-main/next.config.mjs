/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Proxy registration actions to the datajam-app backend so the browser calls it same-origin.
  async rewrites() {
    const apiUrl = process.env.DATAJAM_API_URL
    if (!apiUrl) return []
    return [{ source: "/api/action", destination: `${apiUrl.replace(/\/$/, "")}/api/action` }]
  },
  async redirects() {
    return [
      {
        source: "/register",
        destination: "/auth/sign-up",
        permanent: false,
      },
      {
        source: "/register.html",
        destination: "/auth/sign-up",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
