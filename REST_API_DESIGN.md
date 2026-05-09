# Imara Financial Services REST API Design Blueprint

## Executive Summary

Imara Financial Services is a platform that helps small merchants get financing and keep track of requests. For this first slice, I focused on a simple flow: a merchant signs up, sends a financing request, and waits for a lender to review it.

The main people using the API are merchants, field agents, and partner lenders. Merchants need to create accounts and submit requests. Field agents may help with checking details, and lenders need a clear way to review and respond to those requests.

This blueprint is meant to keep the API simple at the start. I used resources, normal HTTP methods, and clear error handling so the design is easy to follow and can grow later without getting messy.

## Business and Domain Analysis

Imara Financial Services works with small merchants, field agents, and lending partners. The API should help those users move through the main business flow without making things harder than they need to be.

Main actors:

- Merchants: create accounts, send financing requests, and check updates.
- Field agents: help with onboarding and verify information when needed.
- Partner lenders: review requests and decide whether to approve or reject them.
- Admin or support staff: handle alerts and help with unusual cases.

Main workflows:

- Merchant onboarding
- Financing request intake
- Lender review
- Alert handling

Key data needs:

- Merchant identity and contact details
- Business information
- Request amount and repayment period
- Request status and lender notes
- Alert text and timestamps

Constraints:

- Financial data should be treated carefully.
- Some forms may be saved partly before they are finished.
- A merchant should not be able to send the same pending request over and over.
- Request status will change over time, so the API needs to keep that clear.

## Resource Specifications

Define at least 4 resources.

### 1. Resource Name: `merchants`

- Purpose: Stores the merchant profile and basic business details.
- Main fields: merchant_id, business_name, owner_name, phone_number, email, business_type, national_id, status, created_at.
- Data types: UUID, string, enum, datetime.
- Relationships: One merchant can have many financing requests and many alerts.
- Business rules: phone number and email should be unique, and the merchant should be active before sending a financing request.

### 2. Resource Name: `financing_requests`

- Purpose: Stores the financing requests sent by merchants.
- Main fields: request_id, merchant_id, requested_amount, repayment_period_months, purpose, status, lender_notes, submitted_at, updated_at.
- Data types: UUID, UUID, decimal, integer, string, enum, text, datetime.
- Relationships: Each request belongs to one merchant and can be reviewed by a lender.
- Business rules: the amount must stay within the merchant limit, draft requests can still be changed, and approved or rejected requests should not be edited.

### 3. Resource Name: `partner_lenders`

- Purpose: Stores the lenders who review merchant requests.
- Main fields: lender_id, organization_name, contact_email, phone_number, status, created_at.
- Data types: UUID, string, enum, datetime.
- Relationships: One lender can review many financing requests.
- Business rules: only verified lenders should be allowed to review requests, and suspended lenders should not approve anything.

### 4. Resource Name: `disbursements` or `alerts`

- Purpose: Keeps alerts or money movement records, depending on which slice is being tracked.
- Main fields: alert_id, merchant_id, type, message, severity, is_read, created_at.
- Data types: UUID, UUID, string, text, enum, boolean, datetime.
- Relationships: Alerts belong to merchants and may point to a financing request.
- Business rules: alerts should be timestamped, and important alerts should not disappear too quickly.

## Endpoint Map

Use a table with clear REST-style endpoints.

| Resource           | Action                   | Method | URI                                               | Request Example                         | Success Response | Error Response             |
| ------------------ | ------------------------ | ------ | ------------------------------------------------- | --------------------------------------- | ---------------- | -------------------------- |
| merchants          | Create merchant profile  | POST   | /api/v1/merchants                                 | `{ "business_name": "Kigali Traders" }` | `201 Created`    | `400 Bad Request`          |
| merchants          | Get merchant profile     | GET    | /api/v1/merchants/{merchantId}                    | none                                    | `200 OK`         | `404 Not Found`            |
| merchants          | Update merchant profile  | PATCH  | /api/v1/merchants/{merchantId}                    | `{ "phone_number": "+2507xxxxxxx" }`    | `200 OK`         | `400 Bad Request`          |
| financing_requests | Create financing request | POST   | /api/v1/merchants/{merchantId}/financing-requests | `{ "requested_amount": 500000 }`        | `201 Created`    | `422 Unprocessable Entity` |
| financing_requests | Get financing request    | GET    | /api/v1/financing-requests/{requestId}            | none                                    | `200 OK`         | `404 Not Found`            |
| financing_requests | Update draft request     | PATCH  | /api/v1/financing-requests/{requestId}            | `{ "requested_amount": 700000 }`        | `200 OK`         | `409 Conflict`             |
| financing_requests | Submit request           | POST   | /api/v1/financing-requests/{requestId}/submit     | none                                    | `202 Accepted`   | `409 Conflict`             |
| financing_requests | List merchant requests   | GET    | /api/v1/merchants/{merchantId}/financing-requests | none                                    | `200 OK`         | `404 Not Found`            |
| partner_lenders    | List lenders             | GET    | /api/v1/partner-lenders                           | none                                    | `200 OK`         | `200 OK`                   |
| partner_lenders    | Review request           | PATCH  | /api/v1/financing-requests/{requestId}/review     | `{ "status": "approved" }`              | `200 OK`         | `409 Conflict`             |
| alerts             | Create alert             | POST   | /api/v1/alerts                                    | `{ "message": "Verification pending" }` | `201 Created`    | `400 Bad Request`          |
| alerts             | Get merchant alerts      | GET    | /api/v1/merchants/{merchantId}/alerts             | none                                    | `200 OK`         | `404 Not Found`            |

## Validation and Error Strategy

The API should give clear errors so people know what went wrong and what to fix.

1. Required field validation:

- If a merchant leaves out a needed field like business name or requested amount, the API should return `400 Bad Request`.

2. Business rule validation:

- If the requested amount is above the merchant limit, the API should return `422 Unprocessable Entity`.

3. Duplicate request check:

- If a merchant already has a pending request, the API should return `409 Conflict`.

4. Invalid state check:

- If a request is already approved or rejected, it should not be edited again, and the API should return `409 Conflict`.

5. Not found handling:

- If a merchant ID or request ID does not exist, the API should return `404 Not Found`.

Suggested error format:

```json
{
  "error": "validation_error",
  "message": "Request amount exceeds merchant limit.",
  "fields": {
    "amount": "Must be less than or equal to the allowed limit"
  }
}
```

## Trade-Off Rationale

Choose one or two decisions and explain the benefit, cost, and why the choice still makes sense now.

### Trade-off 1

- Decision: Use nested routes for merchant financing requests, like `/api/v1/merchants/{merchantId}/financing-requests`.
- Benefit: It makes the connection between a merchant and their requests easy to see.
- Cost: The URL gets a little longer.
- Why it is still reasonable: This relationship is central to the system, so the extra length is worth it.

### Trade-off 2

- Decision: Use `PATCH` for most updates instead of `PUT`.
- Benefit: It lets the API update just one or two fields without sending the whole record again.
- Cost: It needs careful validation so the data does not get messy.
- Why it is still reasonable: Most updates in this system will be small changes, so `PATCH` feels more practical.

## AI Use Appendix

Be specific and honest.

- AI tool used: ChatGPT
- What I asked it to help with: I used it to brainstorm REST ideas, endpoint names, validation checks, and markdown structure.
- Ideas I kept: I kept the basic resource ideas, nested routes, and the general error strategy.
- Ideas I changed or rejected: I removed some heavy implementation language and changed a few endpoint choices so they fit the Imara context better.
- Why the final design reflects my own judgment: I chose the final resources, routes, and trade-offs based on the assignment needs and what made the most sense to me.

## Final Check

- [ ] I defined at least 4 resources.
- [ ] I included an endpoint map with methods and URIs.
- [ ] I listed validation and error-handling rules.
- [ ] I explained one or two trade-offs.
- [ ] I included the AI Use Appendix.
