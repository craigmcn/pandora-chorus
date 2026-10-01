# Brief Review

* Review of the [Project Brief](Project%20Brief.md), 2026-10-01

Open questions and gaps in the brief, ranked by impact:

* **Tier 1** changes the architecture or cost.
* **Tier 2** changes the data model.
* **Tier 3** is player and UX detail that can wait.

Answered questions are marked **✅** and summarized under [Decisions](#decisions). Record new answers in the brief's Decisions section and mark them here.

## Decisions

Made 2026-10-01:

* **Platform (Q1):** PWA first.
  * **Hard requirement:** audio keeps playing, and the section loop keeps moving to the next track, when the phone or tablet sleeps or locks on its normal settings.
  * **Risk:** iOS Safari and installed PWAs have a history of stopping when one track ends and the next has to start while the screen is locked.
  * **Mitigation:** an early spike that tests section-loop playback on a real iPhone and iPad (installed PWA and in Safari) and on Android. It uses one reused `<audio>` element, swaps `src` on `ended`, and sets Media Session handlers for lock-screen controls.
  * **Fallback:** if lock-screen playback isn't reliable, wrap the app with Capacitor and a native audio plugin. That brings back the app-store accounts and fees described in Q1.
* **Backend (Q5):** Supabase (Postgres, Auth, Storage). Email sending still needs a provider and a sending domain (see Q23).
* **Login (Q6):** email magic link. A secondary email also works, and members stay signed in for the session.
* **Downloads (Q7):** allowed, so tracks and sheet music can be cached for offline practice.

## Tier 1: Decisions that shape the architecture

1. ✅ **Store-listed native apps, or an installable web app (PWA)?**
   * App store overhead: Apple Developer is $99 USD a year and Google Play is $25 once. Listing as an *organization* needs a legal entity and a D-U-N-S number (a business ID Apple asks for); otherwise the app is published under a personal name.
   * Apple review often rejects a login-only app for a private group (guideline 4.2, minimum functionality). The usual route is an unlisted app or an Apple Business Manager custom app. Reviewers also need a demo account.
   * What native genuinely adds: reliable background and lock-screen audio, offline downloads and push notifications. Modern PWAs do much of this (Media Session API, service-worker caching, web push on iOS 16.4+). iOS background audio is the weakest spot.
2. **Who builds, hosts, pays for and maintains this long-term?** An individual, or the choir? What happens if the maintainer steps away? This decides who owns the domain, the email-sending account, storage billing and any developer accounts.
3. **Budget.** What's the monthly ceiling for hosting, audio and PDF storage, and transactional email? Storage and bandwidth for the MP3s are the main variable cost.
4. **Scale.** Roughly how many members per session, songs per session and tracks per song, and how large are the files? How many past sessions should be kept?
5. ✅ **Backend.** The site needs login, file storage, a database and email.
6. ✅ **Login method.** Since the email list *is* the access list, a sign-in link sent by email fits naturally.
7. ✅ **Copyright and licensing.** Can members *download* sheet music and tracks, or only stream and view them?
8. **Jurisdiction and privacy.** Which country and province? This affects consent and unsubscribe rules for news emails (e.g. CASL in Canada, GDPR in the EU) and the handling of personal data such as pronouns. Who can see other members' details: is there a member directory, or are profiles private to the member and the director?

## Tier 2: Gaps in the data model

### Members and access

9. **Membership per session.** How does a member become "current" for a new session? Does the director re-add or tick them, or do members opt back in? Are registration or dues involved, now or later?
10. **What do past members keep?** Public pages only, or also the archived sessions and tracks they sang?
11. **Public vs. members-only.** Which pages are public (landing page, FAQ, standing instructions, news, schedule?), and which are members-only (tracks, sheet music)?
12. **Member edits vs. director control.** The brief says both that the director maintains the list and that members can update their email and section.
    * Can a member change their *primary* email, which is also their login?
    * Can they change section freely, or does the director approve the change?
13. **Parts per song, not per member.** A member might sing Alto 1 in one song and Alto 2 in another. Is the part (1/2/3) set on the member, set per member per song, or chosen in the player each time?
14. **Roles in the system.** Does the accompanist need any admin rights, such as uploading tracks? Is there a co-admin or backup for the director, or section leaders?
15. **Bass/Baritone:** one section or two in the data? Do any songs have other voicings (SSA, solo lines, descants)?

### Sessions, schedule and songs

16. **Session entity.** Confirm that a session has a name, start and end dates, a song list and a schedule. Can a song carry over to a later session without re-uploading its files?
17. **Agenda vs. record.** Instead of overwriting the agenda, keep two fields: "planned" and "what we covered." Should members see both?
18. **Event types.**
    * Are concerts and performances in the schedule too, with extra details (venue, call time, dress code)?
    * How are cancellations (e.g. for weather) shown?
    * Should a weekly rehearsal be set up once as a repeating event, so the director doesn't enter each one?
19. **Song order.** Is there a director-set order (e.g. concert order) that the section loop follows?
20. **Warm-ups.** Are warm-ups songs flagged as "warm-up," or a separate list? Are they excluded from the loop by default but playable on demand?
21. **Sheet music and lyrics.** Is there one sheet-music PDF and one lyrics sheet per song, or sometimes separate scores per part? What file formats (PDF only, or images too)?
22. **Errata and notes.** When a song's notes change mid-session, should members be notified?

### News and email

23. **Sending identity.** Does the choir own a domain? Is email currently sent from the director's personal address? Where should replies go?
24. **Targeting.** Should news go only to everyone, or also to one section, or to new members only (replacing the boilerplate onboarding emails)?
25. **Editor.** What is the director comfortable writing in? A simple rich-text editor (bold, links, lists)? Images or attachments in news items?
26. **Push notifications:** wanted in addition to email?

## Tier 3: Player and UX detail (can wait)

27. **Missing part track.** If a song has no track for the chosen part (e.g. no Alto 2), should the player fall back to Alto, then All voices, or skip the song?
28. **Practice controls beyond looping.** Repeat one song, skip, playback speed, an A–B loop of a tricky passage, a "my part louder" balance? Which matter most to members?
29. **Sheet display while playing.** Show the current song's PDF with a lyrics/sheet music toggle. Confirm there's no expectation of page turns synced to the audio.
30. **Offline use.** Is it needed for rehearsal-venue Wi-Fi or practising in the car? (Related to Q1 and Q7.)
31. **Director's admin device.** Will the director manage the site mostly on a phone or a laptop? Bulk uploads realistically need a laptop; schedule and news edits should work on a phone.
32. **Bulk track upload.** Are filenames consistent enough (e.g. `SongName - Alto 1.mp3`) for the uploader to tag tracks automatically?
33. **Bulk add members** by pasting a list of emails?
34. **Calendar subscription.** An ICS feed of the schedule, so rehearsals show up in members' calendars?
35. **Accessibility.** What are the expectations? Do any members use large text or screen readers?

## Missing sections in the brief

* **Migration:** what's on the current site (platform, amount of content), and do existing songs and tracks need to be imported?
* **Timeline and MVP:** the target launch (e.g. the January 2027 session?), and which features are in the first release vs. later.
* **Success criteria:** what would make the director say this saved time?
* **Out of scope:** dues and payments, attendance tracking, RSVPs, a member directory, chat?
* **Roles in the system:** the Accompanist and Member roles don't yet say what each can *do in the system*.
