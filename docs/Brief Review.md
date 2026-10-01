# Brief Review

* Review of the [Project Brief](Project%20Brief.md), 2026-10-01
* Questions answered 2026-10-01

Open questions and gaps in the brief, ranked by impact:

* **Tier 1** changes the architecture or cost.
* **Tier 2** changes the data model.
* **Tier 3** is player and UX detail.

Each answered question is marked **✅** with its answer. The brief's Decisions section is the summary to build from. All questions are answered.

## Background audio risk

Background audio is a hard requirement: audio keeps playing, and the section loop keeps moving to the next track, when a phone or tablet sleeps or locks on its normal settings.

* **Risk:** iOS Safari and installed PWAs have a history of stopping when one track ends and the next has to start while the screen is locked.
* **Mitigation:** an early spike that tests section-loop playback on a real iPhone and iPad (installed PWA and in Safari) and on Android. It uses one reused `<audio>` element, swaps `src` on `ended`, and sets Media Session handlers for lock-screen controls.
* **Fallback:** if lock-screen playback isn't reliable, wrap the app with Capacitor and a native audio plugin. That brings back the app-store accounts and fees described in Q1.

## Tier 1: Decisions that shape the architecture

1. ✅ **Store-listed native apps, or an installable web app (PWA)?**
   * App store overhead: Apple Developer is $99 USD a year and Google Play is $25 once. Listing as an *organization* needs a legal entity and a D-U-N-S number (a business ID Apple asks for); otherwise the app is published under a personal name.
   * Apple review often rejects a login-only app for a private group (guideline 4.2, minimum functionality). The usual route is an unlisted app or an Apple Business Manager custom app. Reviewers also need a demo account.
   * What native genuinely adds: reliable background and lock-screen audio, offline downloads and push notifications. Modern PWAs do much of this (Media Session API, service-worker caching, web push on iOS 16.4+). iOS background audio is the weakest spot.
   * **Answer:** PWA first, with background audio required (see [Background audio risk](#background-audio-risk)).
2. ✅ **Who builds, hosts, pays for and maintains this long-term?** An individual, or the choir? What happens if the maintainer steps away?
   * **Answer:** Craig, with all accounts in Craig's name.
3. ✅ **Budget.** What's the monthly ceiling for hosting, audio and PDF storage, and transactional email?
   * **Answer:** up to about $25+/month, enough for Supabase Pro (100 GB storage, 250 GB egress).
4. ✅ **Scale.** How many members, songs and tracks per session?
   * **Answer:** medium: 40–80 members, 10–15 songs and 6–10 tracks per song.
5. ✅ **Backend.** The site needs login, file storage, a database and email.
   * **Answer:** Supabase (Postgres, Auth, Storage). Email still needs a sending provider.
6. ✅ **Login method.**
   * **Answer:** email magic link. Primary and secondary addresses both work, and members stay signed in for the session.
7. ✅ **Copyright and licensing.** Can members *download* sheet music and tracks, or only stream and view them?
   * **Answer:** downloads are allowed.
8. ✅ **Jurisdiction and privacy.** Which country, and who can see other members' details?
   * **Answer:** Canada, so CASL applies to email and PIPEDA to personal data. The member directory is opt-in: each member chooses what others can see.

## Tier 2: Gaps in the data model

### Members and access

9. ✅ **Membership per session.** How does a member become "current" for a new session?
   * **Answer:** registration and dues happen elsewhere; the director then marks members active.
10. ✅ **What do past members keep?**
    * **Answer:** public pages only, until they rejoin.
11. ✅ **Public vs. members-only.** Which pages are public?
    * **Answer:** landing, FAQ and standing instructions, news, and schedule.
12. ✅ **Member edits vs. director control.**
    * **Answer:** members can change their primary email after confirming the new address, and the director is notified. Section changes are requests that the director approves.
13. ✅ **Parts per song, not per member.** How are parts like Alto 1 and Alto 2 assigned?
    * **Answer:** members choose their part in the player, and the app remembers it per song.
14. ✅ **Roles in the system.** Who else needs admin rights?
    * **Answer:** a co-admin as backup, and Craig as developer super-admin. The accompanist has no admin rights.
15. ✅ **Sections:** how are they set up in the data?
    * **Answer:** fixed Soprano, Alto, Tenor and Bass/Baritone, with numbered parts per song.

### Sessions, schedule and songs

16. ✅ **Session entity.** Can a song carry over to a later session without re-uploading?
    * **Answer:** yes, through a shared song library that each session picks from.
17. ✅ **Agenda vs. record.**
    * **Answer:** two fields, "planned" and "what we covered." Members see "covered" once it's filled in.
18. ✅ **Event types.**
    * **Answer:** concerts with venue, call time and dress code; weekly rehearsals created for the whole session in one step; cancellations with a reason.
19. ✅ **Song order.** What order does the loop follow?
    * **Answer:** the director sets the order; members can turn on shuffle.
20. ✅ **Warm-ups.**
    * **Answer:** flagged on the song, always excluded from the loop, playable individually.
21. ✅ **Sheet music and lyrics.**
    * **Answer:** one score PDF and one lyrics sheet per song.
22. ✅ **Errata and notes.** Should members be told when a song's notes change?
    * **Answer:** show an "Updated" badge; no email.

### News and email

23. ✅ **Sending identity.**
    * **Answer:** buy a domain for the site and its email.
24. ✅ **Targeting.** Who can a news email go to?
    * **Answer:** all current members, or new members only.
25. ✅ **Editor.**
    * **Answer:** rich text with images and attachments.
26. ✅ **Push notifications.**
    * **Answer:** later, not in the MVP.

## Tier 3: Player and UX detail

27. ✅ **Missing part track.**
    * **Answer:** fall back to the section track, then All voices.
28. ✅ **Practice controls beyond looping.**
    * **Answer:** repeat one song, playback speed and seek/skip. An A–B loop isn't in the MVP.
29. ✅ **Sheet display while playing.**
    * **Answer:** a sheet music/lyrics toggle that follows the current song; no page turns synced to the audio.
30. ✅ **Offline use.**
    * **Answer:** both a "download my section" button and automatic caching of played tracks.
31. ✅ **Director's admin device.**
    * **Answer:** mostly a laptop.
32. ✅ **Bulk track upload.**
    * **Answer:** filenames are mostly consistent, so the uploader tags tracks automatically and the director confirms.
33. ✅ **Bulk add members.**
    * **Answer:** paste a list of emails.
34. ✅ **Calendar subscription.**
    * **Answer:** yes, an ICS feed.
35. ✅ **Accessibility.**
    * **Answer:** WCAG 2.2 AA.

## Previously missing from the brief

* ✅ **Migration:** start fresh; nothing is imported from the old site.
* ✅ **Timeline:** no fixed date.
* ✅ **MVP scope:** all four areas: the practice player and songs, members and login, the schedule, and news, FAQ and pages.
* ✅ **Out of scope:** dues and payments, attendance and RSVPs, chat and messaging, and native store apps (unless the background-audio test fails).
* ✅ **Roles in the system:** covered by Q14.
* ✅ **Success criteria:** what would show the director that this saves time?
  * The director no longer sends the start-of-session boilerplate emails.
  * The director can edit individual content sections instead of the whole page (the current site appears to be a single web page).
  * Access by member and session is automatic, not managed by removing content or changing a shared password.
