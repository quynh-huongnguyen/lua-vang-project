# Lụa Vàng Resort & Spa — CRS Backend

## Project Overview
This repository contains the backend components for the Lụa Vàng Resort & Spa Central Reservation System (CRS).

## Technology Stack
- Supabase PostgreSQL — database
- Supabase Edge Functions — backend API
- GitHub — source code version control

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `check_availability` | POST | Check room availability for a date range |
| `create_booking` | POST | Create a room booking |
| `cancel_booking` | POST | Cancel an existing booking |

## Database Tables
- `rooms` — room details, capacity, rates, and availability status
- `bookings` — guest booking records, check-in/check-out dates, and booking status

## Testing
Each endpoint should be tested for successful requests, invalid input, booking conflicts, and cancellation behavior.

## Security
Server-side secret keys must not be committed to this repository. Authentication and authorization should be configured before production use.
