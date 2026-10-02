# Property Portal API Feature Specification

## Purpose

Provide the shared application service for people browsing, publishing, managing, and moderating property listings in Myanmar.

## Public discovery

- Report service health.
- Return supported locations and their townships for Yangon, Mandalay, and Bago.
- Return only published listings in public search and detail responses.
- Search by sale or rent, location, township, property type, minimum and maximum price, minimum bedrooms, and keyword.
- Sort by newest, price low to high, or price high to low.
- Paginate results with a total count and enforced maximum page size.
- Return enough listing, image, price, location, and demo-label information for search cards and detail views.
- Never expose a draft, unpublished, archived, or hidden listing through a public listing endpoint.

## Accounts and sessions

- Allow a registered account to sign in, inspect the current session, and sign out.
- Sessions expire and can be revoked.
- Authentication failures do not reveal sensitive account information.
- Future account completion includes registration, email verification, password reset, profile editing, password changes, and contact-visibility preferences.

## Owner listing management

- An authenticated account can view only its own private and public listings.
- An owner can create a sale or rental listing as a draft, edit it, add and order images, preview it, publish it, unpublish it, and archive it.
- Required property information includes title, description, type, supported location, positive MMK price, positive area and unit, contact preference, and rental period for rentals.
- Bedrooms, bathrooms, township, and area description may be optional where appropriate.
- Publishing requires all required facts and at least one valid image.
- An owner cannot read or mutate another owner's private listing.
- Published contact information is limited to the owner's chosen visible method.

## Listing states

- Listings use `draft`, `published`, `unpublished`, `archived`, and `hidden` states.
- Owners may publish eligible drafts or unpublished listings, unpublish published listings, and archive their listings.
- Hidden is a moderation state and only an administrator may restore a hidden listing.
- Publishing records when the listing became public; changes preserve reliable created and updated times.

## Moderation

- Administrators can review listings with owner context.
- Administrators can hide abusive or invalid content and restore eligible content.
- Ordinary accounts cannot use moderation actions.

## Images and demo catalog

- A published listing has at least one image and may have up to 20 ordered images with a cover image.
- Image records support useful alt text and provenance fields for source, credit, and license.
- Future upload handling validates size, media type, dimensions, and file content, removes unnecessary metadata, and produces appropriate display sizes.
- The demo catalog contains 24–36 balanced listings across all supported locations, both purposes, and multiple property types and prices.
- Demo entries and contact details are unmistakably fictional and never presented as real offers.

## Quality requirements

- Validation errors use a consistent, actionable format.
- Invalid input, missing resources, unauthenticated access, forbidden actions, and unexpected failures produce appropriate responses.
- Automated coverage protects public visibility, search filters, ownership, listing state transitions, authentication, moderation, and migrations.
- The published API contract describes every supported request, response, parameter, and error.
