# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, TypeScript) with Tailwind CSS; hand-built components, no UI kit (user's choice).

## Users

Job candidates practicing for interviews at a specific company they are applying to. Second audience: peers who act as human interviewers, matched to a candidate. Sessions happen in both bright daytime and dim evening conditions, on laptops and phones.

## Product Purpose

Interview practice tailored to a target company, with feedback after each session. Success means a candidate walks into a real interview having rehearsed realistic, company-specific questions and knows how they performed.

## Positioning

Interview practice built around the company the user is applying to: questions are scraped or generated from what can be found online about that company, and a human interviewer is matched using the candidate's uploaded resume. A generic mock-interview tool cannot truthfully make either claim.

## Operating Context

Two interview modes:

- **AI interview:** the AI asks questions drawn from web-scraped or generated company information, then rates the interview once it is completed.
- **Human interview:** the candidate uploads a resume, a matching system pairs them with another person, and the two are placed into an interview. The assigned interviewer can see the candidate's resume and receives a list of suggested questions based on the target company.

Users switch between an Interviewee and an Interviewer role; the role changes what practice and the call screen show. Calls are recorded with explicit consent. Friends can invite each other to interview. Admins review user reports.

## Capabilities and Constraints

- Resume upload and parsing (skills, experience)
- Company research (scraping and/or generation) to produce questions
- AI-conducted interview with post-interview rating
- Candidate-to-interviewer matching that takes the resume into account
- Interviewer view: candidate resume, suggested company-specific questions, notes
- Post-call interviewer feedback; history with transcript, AI analysis and feedback
- Friends, reporting, account and data deletion
- Undecided: rating criteria detail, account model, and the matching rules

## Evidence on Hand

None. There are no testimonials, user counts, sample ratings or company data. Future work must not fabricate any; demonstration data must be clearly mock.

## Product Principles

- Company specificity is the point; generic questions are a failure of the product.
- Feedback must be legible and actionable, not just a score.
- Both sides of a human interview (candidate and interviewer) get what they need to do it well.
- Treat resumes and recordings as sensitive personal data; consent is explicit.
- Calm under pressure: the interface should lower interview anxiety, never gamify it, never feel like an HR portal, a generic AI startup, or a cold clinical tool.
