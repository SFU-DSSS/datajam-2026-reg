/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
