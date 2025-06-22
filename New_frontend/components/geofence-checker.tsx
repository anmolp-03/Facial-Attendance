"use client"

import { useEffect, useState } from "react"

interface GeofenceCheckerProps {
  onLocationUpdate: (isWithinGeofence: boolean) => void
}

// Office coordinates (example - replace with your actual office location)
const OFFICE_COORDINATES = {
  latitude: 23.0581935,
  longitude: 70.1296924,
  radius: 100, // meters
}

export default function GeofenceChecker({ onLocationUpdate }: GeofenceCheckerProps) {
  const [locationError, setLocationError] = useState<string | null>(null)

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const checkGeofence = (position: GeolocationPosition) => {
    const distance = calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      OFFICE_COORDINATES.latitude,
      OFFICE_COORDINATES.longitude,
    )

    const isWithinGeofence = distance <= OFFICE_COORDINATES.radius
    onLocationUpdate(isWithinGeofence)
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.")
      onLocationUpdate(false)
      return
    }

    // For development/testing purposes, you might want to bypass geofencing
    // Comment out the next line and uncomment the line after for testing
    // onLocationUpdate(true); return;

    const watchId = navigator.geolocation.watchPosition(
      checkGeofence,
      (error) => {
        console.error("Geolocation error:", error)
        setLocationError("Unable to retrieve your location.")
        // For development, allow access even without location
        onLocationUpdate(true)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [onLocationUpdate])

  // This component doesn't render anything visible
  return null
}
