# cURL API Testing Guide

This document provides examples for testing all API endpoints in the Let Em Cook project using cURL.

## Prerequisites

1. **Start your development server:**
   ```bash
   npm run dev
   ```
   Server should be running at `http://localhost:3000`

2. **Optional: Install jq for pretty JSON output:**
   ```bash
   brew install jq  # macOS
   # or
   sudo apt-get install jq  # Linux
   ```

---

## Basic cURL Syntax

```bash
curl -X POST http://localhost:3000/api/ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

**Options:**
- `-X POST` - HTTP method
- `-H` - Add headers
- `-d` - Request body (data)
- `| jq` - Pretty print JSON response

---

## API Endpoints

### 1. Check Valid Ingredients

**Endpoint:** `POST /api/check-valid-ingredients`

**Success Case:**
```bash
curl -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d '{"ingredients_text": "2 cups all-purpose flour, 1 tsp salt, 1/2 cup sugar"}' | jq
```

**Expected Response:**
```json
{
  "isIngredients": true
}
```

**Non-Ingredient Text (should return false):**
```bash
curl -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d '{"ingredients_text": "This is just a random sentence about nothing."}' | jq
```

**Expected Response:**
```json
{
  "isIngredients": false
}
```

**Error Cases:**

Missing field:
```bash
curl -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

Empty text:
```bash
curl -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d '{"ingredients_text": ""}' | jq
```

Too long (over 10,000 characters):
```bash
curl -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d "{\"ingredients_text\": \"$(printf 'a%.0s' {1..10001})\"}" | jq
```

---

### 2. Check Valid Instructions

**Endpoint:** `POST /api/check-valid-instructions`

**Success Case:**
```bash
curl -X POST http://localhost:3000/api/check-valid-instructions \
  -H "Content-Type: application/json" \
  -d '{"instructions_text": "1. Preheat oven to 350F. 2. Mix flour and sugar. 3. Bake for 20 minutes."}' | jq
```

**Expected Response:**
```json
{
  "isInstructions": true
}
```

**Non-Instruction Text (should return false):**
```bash
curl -X POST http://localhost:3000/api/check-valid-instructions \
  -H "Content-Type: application/json" \
  -d '{"instructions_text": "I like eating pizza on Fridays."}' | jq
```

**Expected Response:**
```json
{
  "isInstructions": false
}
```

**Error Cases:**

Missing field:
```bash
curl -X POST http://localhost:3000/api/check-valid-instructions \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

Empty text:
```bash
curl -X POST http://localhost:3000/api/check-valid-instructions \
  -H "Content-Type: application/json" \
  -d '{"instructions_text": ""}' | jq
```

Too long:
```bash
curl -X POST http://localhost:3000/api/check-valid-instructions \
  -H "Content-Type: application/json" \
  -d "{\"instructions_text\": \"$(printf 'a%.0s' {1..10001})\"}" | jq
```

---

### 3. Sort Grocery List

**Endpoint:** `POST /api/sort-grocery-list`

**Success Case:**
```bash
curl -X POST http://localhost:3000/api/sort-grocery-list \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["milk", "chicken breast", "flour", "eggs", "lettuce", "frozen peas"]}' | jq
```

**Expected Response:**
```json
{
  "sortedIngredients": [
    "lettuce",
    "milk",
    "eggs",
    "chicken breast",
    "flour",
    "frozen peas"
  ]
}
```
(Order may vary based on grocery store layout)

**Error Cases:**

Empty array:
```bash
curl -X POST http://localhost:3000/api/sort-grocery-list \
  -H "Content-Type: application/json" \
  -d '{"ingredients": []}' | jq
```

Not an array:
```bash
curl -X POST http://localhost:3000/api/sort-grocery-list \
  -H "Content-Type: application/json" \
  -d '{"ingredients": "milk, eggs, flour"}' | jq
```

Missing field:
```bash
curl -X POST http://localhost:3000/api/sort-grocery-list \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

---

## Debugging Tips

### 1. View Full Response (Including Headers)
```bash
curl -v -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d '{"ingredients_text": "flour, sugar"}'
```

### 2. Save Response to File
```bash
curl -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d '{"ingredients_text": "flour, sugar"}' \
  -o response.json
```

### 3. Check HTTP Status Code Only
```bash
curl -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d '{"ingredients_text": "flour"}' \
  -o /dev/null -w '%{http_code}\n' -s
```

### 4. Test from File
Create a file `test-data.json`:
```json
{
  "ingredients_text": "2 cups flour, 1 tsp salt"
}
```

Then:
```bash
curl -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d @test-data.json | jq
```

---

## Common Error Responses

**400 Bad Request:**
```json
{
  "error": "Please enter your ingredients"
}
```

**500 Internal Server Error:**
```json
{
  "error": "We couldn't validate your ingredients. Please try again"
}
```

**OpenAI API Error (varies):**
```json
{
  "error": "The server had an error while processing your request"
}
```

---

## Production Testing

When testing against production (replace with your actual domain):

```bash
curl -X POST https://yourdomain.com/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d '{"ingredients_text": "flour, sugar"}'
```

---

## Quick Test Script

Create a file `test-apis.sh`:

```bash
#!/bin/bash

echo "Testing check-valid-ingredients..."
curl -X POST http://localhost:3000/api/check-valid-ingredients \
  -H "Content-Type: application/json" \
  -d '{"ingredients_text": "2 cups flour"}' | jq

echo "\nTesting check-valid-instructions..."
curl -X POST http://localhost:3000/api/check-valid-instructions \
  -H "Content-Type: application/json" \
  -d '{"instructions_text": "Mix and bake at 350F"}' | jq

echo "\nTesting sort-grocery-list..."
curl -X POST http://localhost:3000/api/sort-grocery-list \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["milk", "eggs", "chicken"]}' | jq
```

Make it executable and run:
```bash
chmod +x test-apis.sh
./test-apis.sh
```

---

## Notes

- All endpoints require `Content-Type: application/json` header
- All endpoints use POST method
- OpenAI API calls may take 1-3 seconds to respond
- Make sure your `.env` file has `OPENAI=your-api-key` set
- The dev server must be running on port 3000

---

## Troubleshooting

**"Connection refused"**
- Make sure dev server is running: `npm run dev`

**"Cannot read properties of undefined"**
- Check that you're sending the correct field names in JSON

**"OpenAI API error"**
- Verify your `OPENAI` environment variable is set in `.env`
- Check that you have API credits in your OpenAI account

**"Invalid JSON"**
- Make sure to escape quotes properly in bash
- Use single quotes for the outer string, double quotes inside JSON
