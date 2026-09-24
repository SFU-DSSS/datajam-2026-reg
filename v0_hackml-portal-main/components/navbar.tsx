"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isMenuOpen && !target.closest(".nav-menu") && !target.closest(".hamburger-menu")) {
        closeMenu()
      }
    }

    if (isMenuOpen) {
      document.addEventListener("click", handleClickOutside)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.removeEventListener("click", handleClickOutside)
      document.body.style.overflow = ""
    }
  }, [isMenuOpen])

  return (
    <>
      <header className="nav-bar">
        <div className="container">
          <div className="flex items-center justify-between w-full">
            <Link href="/" className="nav-logo" onClick={closeMenu}>
              HackML 2026
            </Link>
            <button
              className={`hamburger-menu ${isMenuOpen ? "hamburger-open" : ""}`}
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <nav className={`nav-menu ${isMenuOpen ? "nav-menu-open" : ""}`}>
              <ul className="nav-links">
                <li>
                  <Link href="/" onClick={closeMenu}>
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/rules" onClick={closeMenu}>
                    Rules
                  </Link>
                </li>
                <li>
                  <Link href="/schedule" onClick={closeMenu}>
                    Schedule
                  </Link>
                </li>
                <li>
                  <Link href="/auth/sign-up" onClick={closeMenu}>
                    Register
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" onClick={closeMenu}>
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/auth/sign-up" onClick={closeMenu}>
                    Sign Up
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>
      {isMenuOpen && <div className="menu-backdrop" onClick={closeMenu}></div>}
    </>
  )
}

