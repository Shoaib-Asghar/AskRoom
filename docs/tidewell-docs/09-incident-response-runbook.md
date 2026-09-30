# Incident Response Runbook

**Owner:** Head of Engineering (Daniel Okafor) | **Last reviewed:** 9 February 2026

## Severity levels

| Level | Definition | Acknowledge within | Update cadence |
|---|---|---|---|
| SEV1 | Complete outage or data loss affecting customers | 5 minutes | Every 30 minutes |
| SEV2 | Significant degradation for some customers | 15 minutes | Every 60 minutes |
| SEV3 | Minor issue with a workaround | Next business day | As needed |

## Communication
- For a SEV1, the public status page must be updated **within 20 minutes** of the first alert.
- Customer Success notifies affected customers on SEV1 incidents.
- Open a dedicated Slack channel named `#inc-YYYYMMDD` for each SEV1 and SEV2.

## On-call rotation
- Rotation is weekly. Handover happens every **Monday at 10:00 Rotterdam time**.
- Each week has a **primary** and a **secondary** on-call engineer.

## Escalation
1. If the primary on-call does not acknowledge a page within **10 minutes**, it escalates automatically to the secondary.
2. If the secondary does not acknowledge within a **further 10 minutes**, it escalates to the engineering manager on duty.

The first responder acts as incident commander unless they hand the role over explicitly.

## On-call compensation
- Primary: **EUR 150 per week**. Secondary: **EUR 75 per week**.
- If a responder works on a SEV1 for more than 1 hour on a weekend day, they earn **1 day of time off in lieu (TOIL)** per day worked. TOIL must be taken within 60 days.

## Postmortems
A written postmortem is required within **5 working days** for every SEV1 and SEV2. SEV3 incidents do not need one.
