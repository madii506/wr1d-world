# WR1D

Every outage is a launch. A live board of public status pages, an "is it down?" checker and a coin-kit maker, all in ASCII.

- `/api/status` reads 18 public Statuspage feeds (server side, cached 60 s).
- `/api/check?url=` makes one timed request to a public site.
- No keys, no database, no wallet custody.
