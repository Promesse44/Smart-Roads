# Imara Financial Services REST API Design Blueprint

## Summary

Imara helps small merchants get short-term financing and keep track of how requests are going. For this first piece I focused on a simple flow we actually talked about in class: merchant signs up, makes a financing request, and a lender reviews it.

Who uses this: merchants, field agents, and partner lenders. Merchants create accounts and submit requests; field agents sometimes help fill in or check info; lenders need a clear way to see requests and respond.

I kept things plain on purpose: resource-based URLs, normal HTTP verbs, and obvious error messages. The idea is to make something we can explain to a developer fast, and then expand later if we need to.

## Business and Domain Analysis

Imara works with small merchants, field agents, and lenders. The API should let those people do their jobs without extra friction — practical first, fancy later.

Main actors (short):

- Merchants: make an account, apply for financing, check status.
- Field agents: help merchants onboard and verify documents when needed.
- Partner lenders: look at requests and either approve, reject, or ask for more info.
- Admin: keep an eye on alerts and step in if something looks off or if there’s a conflict.

Here’s what we’ll focus on first: getting merchants onboarded, handling new financing requests, letting lenders review those requests, and dealing with alerts that pop up.

The info we need at this point is straightforward: who the merchant is, how to reach them, some basic details about their business, how much money they want and for how long, the status of each request, lender notes, and alerts with timestamps.

Just remember, all this involves sensitive financial info:

- Sensitive financial data: don't leak stuff in logs or errors.
- Partial/draft submissions: people may save work-in-progress requests.
- Duplicate pending requests: block obvious duplicates.
- Status changes over time: requests move draft -> submitted -> reviewed -> decided.

Class reflection: in our group we agreed to use resource-style URLs (so `/drivers` not `/getDrivers`). Nesting like `/users/{userId}/rides` felt weird at first but it makes relationships clear. Also we cleared up PATCH vs PUT — PATCH for small edits (phone number), PUT when you replace the whole object.

## Resource Specifications

### 1. merchants

This resource stores all the important details about a merchant—basically, everything you see on their dashboard. It's got fields like merchant_id, business_name, owner_name, phone_number, email, business_type, national_id, status, and created_at. Data types are a mix of UUIDs, strings, enums, and datetimes. Merchants can have multiple financing_requests and alerts linked to them. Phone and email have to be unique, and only merchants with an "active" status can submit financing requests.

### 2. financing_requests

Here's where every financing request gets tracked. The main fields are request_id, merchant_id, requested_amount, repayment_period_months, purpose, status, lender_notes, submitted_at, and updated_at. You'll see UUIDs, decimals, integers, strings, enums, text, and datetimes here. Each request connects to the merchant making it. Belongs to one merchant; can be reviewed by a lender. The requested amount has to stay within the merchant's limit; you can edit drafts, but approved or rejected requests are locked.

### 3. partner_lenders

The partner_lenders table keeps track of all lenders who can review requests. You'll find their unique ID, organization name, email, phone number, status, and the date they joined. Every lender gets a UUID, and their status is saved as an enum. Dates in this table use the datetime format. One lender can handle several financing requests. Only verified lenders are allowed to review or approve anything, and if someone's suspended, they're locked out until their status changes.

### 4. alerts

Alerts are what let merchants know when something changes—status updates, problems, whatever needs attention. The main info here includes alert ID, which merchant it's for, what kind of alert, the message itself, how severe it is, whether it's been read, and when it was created. Each item uses the right data type: UUID for IDs, strings and text for names and messages, enums for alert types and severity, boolean for "is_read," and datetime for created_at. Alerts link to merchants and sometimes a financing request. Every alert gets a timestamp. Critical alerts stick around for audits.

## Endpoint Map

| Resource           | Action                   | Method | URI                                               | Request Example                       | Success Response | Error Response           |
| ------------------ | ------------------------ | ------ | ------------------------------------------------- | ------------------------------------- | ---------------- | ------------------------ |
| merchants          | Create merchant profile  | POST   | /api/v1/merchants                                 | { "business_name": "Kigali Traders" } | 201 Created      | 400 Bad Request          |
| merchants          | Get merchant profile     | GET    | /api/v1/merchants/{merchantId}                    | none                                  | 200 OK           | 404 Not Found            |
| merchants          | Update merchant profile  | PATCH  | /api/v1/merchants/{merchantId}                    | { "phone_number": "+2507xxxxxxx" }    | 200 OK           | 400 Bad Request          |
| financing_requests | Create financing request | POST   | /api/v1/merchants/{merchantId}/financing-requests | { "requested_amount": 500000 }        | 201 Created      | 422 Unprocessable Entity |
| financing_requests | Get financing request    | GET    | /api/v1/financing-requests/{requestId}            | none                                  | 200 OK           | 404 Not Found            |
| financing_requests | Update draft request     | PATCH  | /api/v1/financing-requests/{requestId}            | { "requested_amount": 700000 }        | 200 OK           | 409 Conflict             |
| financing_requests | Submit request           | POST   | /api/v1/financing-requests/{requestId}/submit     | none                                  | 202 Accepted     | 409 Conflict             |
| financing_requests | List merchant requests   | GET    | /api/v1/merchants/{merchantId}/financing-requests | none                                  | 200 OK           | 404 Not Found            |
| partner_lenders    | List lenders             | GET    | /api/v1/partner-lenders                           | none                                  | 200 OK           | 200 OK                   |
| partner_lenders    | Review request           | PATCH  | /api/v1/financing-requests/{requestId}/review     | { "status": "approved" }              | 200 OK           | 409 Conflict             |
| alerts             | Create alert             | POST   | /api/v1/alerts                                    | { "message": "Verification pending" } | 201 Created      | 400 Bad Request          |
| alerts             | Get merchant alerts      | GET    | /api/v1/merchants/{merchantId}/alerts             | none                                  | 200 OK           | 404 Not Found            |

## Validation and Error Strategy

People need quick, clear info about what went wrong so they don't get stuck. Here's how:

- If a merchant leaves out a needed field like business name or requested amount, return `400 Bad Request`.
- If the requested amount is above the merchant limit, return `422 Unprocessable Entity`.
- If a merchant already has a pending request, return `409 Conflict`.
- If a request is already approved or rejected, it should not be edited again—return `409 Conflict`.
- If a merchant ID or request ID doesn't exist, return `404 Not Found`.

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

### Trade-off 1

If you go with nested routes for financing requests—say, `/api/v1/merchants/{merchantId}/financing-requests`—you create a clear connection between merchants and their requests. That structure helps everyone read the API quickly and know exactly whose request belongs to whom. Plus, it keeps things organized. On the flip side, though, you end up with longer URLs and maybe extra steps when you need to fetch or manage requests without caring about the merchant details. So, it's neat and readable, but sometimes just adds extra navigation. This setup spells out the link between merchants and their requests. Sure, the URLs look a bit longer, but it's clear, and that matters in a system like this.

### Trade-off 2

Why use PATCH for most updates instead of PUT? PATCH means you only send what you want to change, not a whole pile of data. The risk? You have to validate carefully so you don't end up with junk data. But keeping things simpler for most edits is worth the extra diligence.

## AI Use Appendix

I used NotebookLM's chatbot to help brainstorm ideas for REST APIs, things like endpoint names, validation checks, and how to organize everything in markdown. What I kept were the basic resources, some nested routes, and the general plan for handling errors. But I tossed out some of the more complicated implementation suggestions and tweaked a few endpoints, so they fit the Imara context.

The final design really came down to my own judgment. I picked the resources and routes based on what worked best for the assignment and what felt right to me.
