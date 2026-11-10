# RentiGoo
Peer-to-peer rental marketplace for India. Launch market: Bhopal, Madhya Pradesh. Deployed to AWS Amplify.

## Brand (from the logo, do not substitute)
Accent golden yellow #F2D04E, ink #24221B, cream #FAF7F0, white text on dark. Logo files go in /public/brand.

## Stack
Vite + React + TypeScript, Tailwind, Framer Motion, React Router. Backend: AWS Amplify Gen 2 in /amplify (Cognito auth, AppSync + DynamoDB data, S3 photos, Lambda for bookings/reviews). Pricing and calculator logic lives in /shared and is used by both the browser and the Lambdas. Seed/mock data in /src/data; `VITE_DATA_MODE=mock|amplify` picks the data source. Full plan: ~/.claude/plans/plan-a-complete-rentigoo-imperative-cloud.md.

## Rules
Human, warm copy (no corporate filler). Mobile-first. Accessible contrast and keyboard focus. Light and dark themes. Rupee pricing. Plan before coding, build one page at a time, run the build and fix errors before saying done.
