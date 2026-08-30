# Third-Party Licenses and Notices

This project uses the following direct runtime dependencies. Exact resolved versions, including transitive packages, are recorded in `package-lock.json`.

## Direct runtime dependencies

| Technology | Purpose | License or terms |
|---|---|---|
| Next.js 16 | Web application framework | MIT |
| React 19 / React DOM 19 | User interface | MIT |
| Firebase JavaScript SDK 12 | Browser authentication | Apache-2.0 |
| Express 5 | Backend HTTP API | MIT |
| Mongoose 9 | MongoDB object modelling | MIT |
| Firebase Admin SDK 14 | Server token verification | Apache-2.0 |
| Google Cloud Vision client 6 | Receipt text extraction | Apache-2.0; Google Cloud service terms also apply |
| Zod 4 | Runtime validation | MIT |
| Helmet 8 | HTTP security headers | MIT |
| CORS 2 | Cross-origin policy middleware | MIT |
| dotenv 17 | Local environment loading | BSD-2-Clause |
| Multer 2.3.0 | In-memory receipt upload handling | MIT |
| Express Rate Limit 8.7.0 | Receipt endpoint rate limiting | MIT |

## External services and assets

Google Cloud Vision is the selected receipt OCR provider. Its client library is licensed under Apache-2.0, and use of the hosted API is also governed by the applicable Google Cloud service terms.

MongoDB Atlas, Firebase Authentication, Google Cloud Vision, and Vercel are hosted services governed by their respective service terms. MongoDB server licensing is separate from the MIT-licensed Mongoose client used by this codebase.

The organizer-provided P12 public JSON is used only as an external test input and is not committed by this project.

## Security advisory note

The dependency audit performed during final verification reported no high or critical advisories. Six moderate transitive advisories remain in the Firebase Admin storage dependency chain; npm's offered automatic resolution is a breaking SDK downgrade, so it was not applied.

Do not add copied fonts, icons, images, datasets, or code unless their license permits use and the required notice is recorded here.
