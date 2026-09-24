"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function ParticipantRegistrationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentNumber: "",
    discordUsername: "",
    major: "",
    year: "",
    howHeard: [] as string[],
    kaggleUsername: "",
    dietaryRestrictions: "",
  })

  const toggleHowHeard = (option: string) => {
    setFormData({
      ...formData,
      howHeard: formData.howHeard.includes(option)
        ? formData.howHeard.filter((item) => item !== option)
        : [...formData.howHeard, option],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to register",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.from("participants").insert({
        id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        student_number: formData.studentNumber,
        discord_username: formData.discordUsername,
        major: formData.major,
        year: formData.year,
        how_heard: formData.howHeard,
        kaggle_username: formData.kaggleUsername,
        dietary_restrictions: formData.dietaryRestrictions,
      })

      if (error) throw error

      toast({
        title: "Success!",
        description: "Your registration has been completed",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save registration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="retro-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="firstName" className="retro-label">First Name</label>
          <input
            id="firstName"
            type="text"
            className="retro-input"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="lastName" className="retro-label">Last Name</label>
          <input
            id="lastName"
            type="text"
            className="retro-input"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="email" className="retro-label">Email</label>
        <input
          id="email"
          type="email"
          className="retro-input"
          placeholder="data8@sfu.ca"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <p className="form-hint">Preferred: @sfu.ca email</p>
      </div>

      <div className="form-group">
        <label htmlFor="studentNumber" className="retro-label">Student Number</label>
        <input
          id="studentNumber"
          type="text"
          className="retro-input"
          placeholder="300913643"
          value={formData.studentNumber}
          onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
          required
        />
        <p className="form-hint">9-digit number listed on your student ID</p>
      </div>

      <div className="form-group">
        <label htmlFor="discordUsername" className="retro-label">Discord Username</label>
        <input
          id="discordUsername"
          type="text"
          className="retro-input"
          placeholder="data8"
          value={formData.discordUsername}
          onChange={(e) => setFormData({ ...formData, discordUsername: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="major" className="retro-label">Major</label>
        <select
          id="major"
          className="retro-input retro-select"
          value={formData.major}
          onChange={(e) => setFormData({ ...formData, major: e.target.value })}
          required
        >
          <option value="">Select your major</option>
          <option value="data-science">Data Science</option>
          <option value="computer-science">Computer Science</option>
          <option value="statistics">Statistics</option>
          <option value="business">Business</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="year" className="retro-label">What year are you in?</label>
        <select
          id="year"
          className="retro-input retro-select"
          value={formData.year}
          onChange={(e) => setFormData({ ...formData, year: e.target.value })}
          required
        >
          <option value="">Select your year</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4+">4+</option>
        </select>
      </div>

      <div className="form-group">
        <label className="retro-label">How did you hear about this event?</label>
        <div className="retro-checkbox-group">
          {["Instagram", "Discord", "Email", "A friend", "Posters", "Other"].map((option) => (
            <label key={option} className="retro-checkbox-label">
              <input
                type="checkbox"
                className="retro-checkbox"
                checked={formData.howHeard.includes(option)}
                onChange={() => toggleHowHeard(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="kaggleUsername" className="retro-label">Kaggle Username</label>
        <input
          id="kaggleUsername"
          type="text"
          className="retro-input"
          placeholder="your_kaggle_username"
          value={formData.kaggleUsername}
          onChange={(e) => setFormData({ ...formData, kaggleUsername: e.target.value })}
          required
        />
        <p className="form-hint">
          If you haven't already, please create a free Kaggle account at{" "}
          <a href="https://www.kaggle.com/" target="_blank" rel="noopener noreferrer" className="retro-link">
            kaggle.com
          </a>
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="dietaryRestrictions" className="retro-label">Do you have any dietary restrictions?</label>
        <textarea
          id="dietaryRestrictions"
          className="retro-input retro-textarea"
          placeholder="e.g., Vegetarian, Vegan, Gluten-free, Nut allergy, None"
          value={formData.dietaryRestrictions}
          onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
          required
          rows={3}
        />
      </div>

      <button type="submit" className="cta-button" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Registration"}
      </button>
    </form>
  )
}
