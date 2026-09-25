"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const fieldClass =
  "h-12 rounded-sm border-border bg-background px-4 text-sm md:text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/30"

function FieldHeader({ htmlFor, label, required = true }: { htmlFor?: string; label: string; required?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={htmlFor} className="font-mono text-xs leading-normal font-semibold uppercase text-primary">
        {`// ${label}`}
      </Label>
      <span className="font-mono text-[11px] text-slate-600">{required ? "[REQUIRED]" : "[OPTIONAL]"}</span>
    </div>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] leading-normal text-slate-600">{children}</p>
}

// Text input with the terminal-style "_" cursor from the design
function TerminalInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input className={cn(fieldClass, "pr-10", className)} {...props} />
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-xs text-slate-600">
        _
      </span>
    </div>
  )
}


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
    <form onSubmit={handleSubmit} className="flex flex-col gap-9 font-sans leading-normal">
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-2">
            <FieldHeader htmlFor="firstName" label="First Name" />
            <TerminalInput
              id="firstName"
              placeholder="e.g. Marie"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldHeader htmlFor="lastName" label="Last Name" />
            <TerminalInput
              id="lastName"
              placeholder="e.g. Curie"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldHeader htmlFor="email" label="Email Address" />
          <TerminalInput
            id="email"
            type="email"
            placeholder="e.g. mcurie@sfu.ca"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <FieldHint>Preferred: @sfu.ca email</FieldHint>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-2">
            <FieldHeader htmlFor="studentNumber" label="Student Number" />
            <TerminalInput
              id="studentNumber"
              placeholder="e.g. 300913643"
              value={formData.studentNumber}
              onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
              required
            />
            <FieldHint>9-digit number listed on your student ID</FieldHint>
          </div>
          <div className="flex flex-col gap-2">
            <FieldHeader htmlFor="discordUsername" label="Discord Username" />
            <TerminalInput
              id="discordUsername"
              placeholder="e.g. data8"
              value={formData.discordUsername}
              onChange={(e) => setFormData({ ...formData, discordUsername: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-2">
            <FieldHeader htmlFor="major" label="Major / Program" />
            <Select value={formData.major} onValueChange={(major) => setFormData({ ...formData, major })} required>
              <SelectTrigger
                id="major"
                className={cn(fieldClass, "w-full data-[size=default]:h-12 [&_svg:not([class*='text-'])]:text-primary [&_svg]:opacity-100")}
              >
                <SelectValue placeholder="Select Major" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data-science">Data Science</SelectItem>
                <SelectItem value="computer-science">Computer Science</SelectItem>
                <SelectItem value="statistics">Statistics</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <FieldHeader htmlFor="year" label="Year of Study" />
            <Select value={formData.year} onValueChange={(year) => setFormData({ ...formData, year })} required>
              <SelectTrigger
                id="year"
                className={cn(fieldClass, "w-full data-[size=default]:h-12 [&_svg:not([class*='text-'])]:text-primary [&_svg]:opacity-100")}
              >
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4+">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="contents">
            <FieldHeader label="How did you hear about this event?" required={false} />
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {["Instagram", "Discord", "Email", "A friend", "Posters", "Other"].map((option) => (
              <Label
                key={option}
                className="h-12 cursor-pointer gap-3 rounded-sm border border-border bg-background px-4 text-sm font-normal text-muted-foreground has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:text-foreground"
              >
                <Checkbox
                  checked={formData.howHeard.includes(option)}
                  onCheckedChange={() => toggleHowHeard(option)}
                  className="rounded-[2px] border-slate-600"
                />
                {option}
              </Label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <FieldHeader htmlFor="kaggleUsername" label="Kaggle Username" />
          <TerminalInput
            id="kaggleUsername"
            placeholder="e.g. your_kaggle_username"
            value={formData.kaggleUsername}
            onChange={(e) => setFormData({ ...formData, kaggleUsername: e.target.value })}
            required
          />
          <FieldHint>
            If you haven't already, please create a free Kaggle account at{" "}
            <a
              href="https://www.kaggle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              kaggle.com
            </a>
          </FieldHint>
        </div>

        <div className="flex flex-col gap-2">
          <FieldHeader htmlFor="dietaryRestrictions" label="Dietary Restrictions" />
          <Textarea
            id="dietaryRestrictions"
            className={cn(fieldClass, "h-auto min-h-24 py-3")}
            placeholder="e.g. Vegetarian, Vegan, Gluten-free, Nut allergy, None"
            value={formData.dietaryRestrictions}
            onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
            required
            rows={3}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="h-14 w-full rounded-md font-display text-base font-extrabold shadow-[0_4px_8px_rgba(0,240,255,0.25)]"
        >
          {isLoading ? "SUBMITTING..." : "SUBMIT REGISTRATION"}
        </Button>
        <p className="text-center font-mono text-[11px] text-slate-600">
          * BY REGISTERING, YOU AGREE TO SFU DATA JAM ETHICS &amp; RULES_
        </p>
      </div>
    </form>
  )
}
